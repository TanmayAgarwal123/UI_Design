from flask import Flask, render_template, redirect, url_for, request, session, jsonify
import json
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'ib-academy-2026'

TOTAL_LESSONS = 16
TOTAL_QUIZ = 5
INTERACTIVE_TYPES = {'interactive_sort','interactive_sequence','interactive_match','interactive_deal'}


def load_data(filename):
    with open(f'data/{filename}') as f:
        return json.load(f)


def evaluate_interactive(lesson, form_data):
    t = lesson['type']
    if t == 'interactive_sort':
        correct_map = lesson['answers']
        results, all_correct = {}, True
        for deal in lesson['deals']:
            did = deal['id']
            user_ans = form_data.get(did, '')
            is_ok = user_ans == correct_map[did]
            if not is_ok: all_correct = False
            results[did] = {'user': user_ans, 'correct': correct_map[did], 'ok': is_ok}
        return {'type': t, 'results': results, 'all_correct': all_correct}

    if t in ('interactive_sequence', 'interactive_deal'):
        items_key = 'steps' if t == 'interactive_sequence' else 'stages'
        correct_order = lesson['correct_order']
        items = lesson[items_key]
        user_order = {item['id']: form_data.get(item['id'], '') for item in items}
        results, all_correct = {}, True
        for item in items:
            iid = item['id']
            user_pos = user_order.get(iid, '')
            correct_pos = correct_order.index(iid) + 1
            is_ok = str(user_pos) == str(correct_pos)
            if not is_ok: all_correct = False
            results[iid] = {'label': item['label'], 'user_pos': user_pos, 'correct_pos': correct_pos, 'ok': is_ok}
        return {'type': t, 'results': results, 'all_correct': all_correct, 'correct_order': correct_order, 'item_list': items}

    if t == 'interactive_match':
        correct_map = lesson['answers']
        desc_map = {d['id']: d['text'] for d in lesson['descriptions']}
        results, all_correct = {}, True
        for role in lesson['roles']:
            user_desc_id = form_data.get(role, '')
            correct_desc_id = correct_map[role]
            is_ok = user_desc_id == correct_desc_id
            if not is_ok: all_correct = False
            results[role] = {
                'user_desc_id': user_desc_id,
                'user_text': desc_map.get(user_desc_id, '(not answered)'),
                'correct_desc_id': correct_desc_id,
                'correct_text': desc_map[correct_desc_id],
                'ok': is_ok
            }
        return {'type': t, 'results': results, 'all_correct': all_correct}
    return None


# ── Home ──────────────────────────────────────────────────────────────
@app.route('/')
def home():
    glossary = load_data('glossary.json')
    visited = session.get('page_visits', {})
    quiz_answers = session.get('quiz_answers', {})
    quiz_history = session.get('quiz_history', [])
    completed = len(visited)
    pct = int(completed / TOTAL_LESSONS * 100)
    best_score = max([a['score'] for a in quiz_history], default=None) if quiz_history else None
    # Next incomplete lesson
    next_lesson = next((i for i in range(1, TOTAL_LESSONS + 1) if str(i) not in visited), None)
    return render_template('home.html',
        completed=completed, total=TOTAL_LESSONS,
        pct=pct, best_score=best_score,
        total_quiz=TOTAL_QUIZ, quiz_history=quiz_history,
        next_lesson=next_lesson, glossary=glossary)


@app.route('/start', methods=['POST'])
def start():
    session.clear()
    session['start_time'] = datetime.now().isoformat()
    session['page_visits'] = {}
    session['interactions'] = {}
    session['quiz_answers'] = {}
    session['notes'] = {}
    session['hints_used'] = []
    session['quiz_history'] = []
    session['streak'] = 0
    session['best_streak'] = 0
    return redirect(url_for('learn', lesson_num=1))


# ── Learn ─────────────────────────────────────────────────────────────
@app.route('/learn/<int:lesson_num>', methods=['GET', 'POST'])
def learn(lesson_num):
    lessons = load_data('lessons.json')
    glossary = load_data('glossary.json')
    if lesson_num < 1 or lesson_num > len(lessons):
        return redirect(url_for('home'))
    lesson = lessons[lesson_num - 1]

    visits = session.get('page_visits', {})
    if str(lesson_num) not in visits:
        visits[str(lesson_num)] = datetime.now().isoformat()
        session['page_visits'] = visits

    note = session.get('notes', {}).get(str(lesson_num), '')

    if request.method == 'POST':
        form_data = dict(request.form)
        interactions = session.get('interactions', {})
        interactions[str(lesson_num)] = form_data
        session['interactions'] = interactions

        if lesson['type'] in INTERACTIVE_TYPES:
            feedback = evaluate_interactive(lesson, form_data)
            return render_template('learn.html',
                lesson=lesson, lesson_num=lesson_num,
                total_lessons=len(lessons), prev_answers=form_data,
                feedback=feedback, note=note, glossary=glossary)

        next_num = lesson.get('next', lesson_num + 1)
        if isinstance(next_num, str) and next_num == 'quiz':
            return redirect(url_for('quiz_intro'))
        if int(next_num) > len(lessons):
            return redirect(url_for('quiz_intro'))
        return redirect(url_for('learn', lesson_num=int(next_num)))

    prev_answers = session.get('interactions', {}).get(str(lesson_num), {})
    return render_template('learn.html',
        lesson=lesson, lesson_num=lesson_num,
        total_lessons=len(lessons), prev_answers=prev_answers,
        feedback=None, note=note, glossary=glossary)


# ── Notes (AJAX) ──────────────────────────────────────────────────────
@app.route('/api/note', methods=['POST'])
def save_note():
    data = request.get_json()
    notes = session.get('notes', {})
    notes[str(data.get('lesson', ''))] = data.get('text', '')
    session['notes'] = notes
    return jsonify({'status': 'ok'})


# ── Quiz ──────────────────────────────────────────────────────────────
@app.route('/quiz')
def quiz_intro():
    mode = request.args.get('mode', 'normal')
    # Reset quiz state so every attempt starts fresh
    session['quiz_answers'] = {}
    session['hints_used']   = []
    session['streak']       = 0
    return render_template('quiz_intro.html', mode=mode)


@app.route('/quiz/<int:q_num>', methods=['GET', 'POST'])
def quiz(q_num):
    questions = load_data('quiz.json')
    glossary  = load_data('glossary.json')
    if q_num < 1 or q_num > len(questions):
        return redirect(url_for('results'))
    question = questions[q_num - 1]
    mode = request.args.get('mode', session.get('quiz_mode', 'normal'))
    session['quiz_mode'] = mode
    timer_seconds = 20 if mode == 'hard' else 45

    if request.method == 'POST':
        action = request.form.get('action', 'answer')

        if action == 'hint':
            hints_used = session.get('hints_used', [])
            if q_num not in hints_used:
                hints_used.append(q_num)
                session['hints_used'] = hints_used
            return jsonify({'hint': question.get('hint', 'No hint available.'), 'status': 'ok'})

        if action == 'next':
            if q_num >= len(questions):
                return redirect(url_for('results'))
            return redirect(url_for('quiz', q_num=q_num + 1, mode=mode))

        # action == 'answer'
        chosen   = request.form.get('answer', '')
        timed_out = request.form.get('timed_out', '') == '1'

        # Save answer
        answers = session.get('quiz_answers', {})
        answers[str(q_num)] = chosen
        session['quiz_answers'] = answers

        # Streak
        is_correct = (chosen == question['correct'])
        streak = session.get('streak', 0)
        if is_correct:
            streak += 1
            session['streak'] = streak
            session['best_streak'] = max(session.get('best_streak', 0), streak)
        else:
            session['streak'] = 0

        return render_template('quiz.html',
            question=question, q_num=q_num, total=len(questions),
            mode=mode, timer_seconds=timer_seconds,
            streak=session.get('streak', 0),
            best_streak=session.get('best_streak', 0),
            hints_used=session.get('hints_used', []),
            timed_out=timed_out,
            feedback={
                'chosen':     chosen,
                'correct':    question['correct'],
                'is_correct': is_correct,
                'explanation': question['explanation'],
                'timed_out':  timed_out,
            }, glossary=glossary)

    # GET — always show a clean unanswered question, never auto-feedback
    return render_template('quiz.html',
        question=question, q_num=q_num, total=len(questions),
        mode=mode, timer_seconds=timer_seconds,
        streak=session.get('streak', 0),
        best_streak=session.get('best_streak', 0),
        hints_used=session.get('hints_used', []),
        timed_out=False,
        feedback=None,
        glossary=glossary)


# ── Results ───────────────────────────────────────────────────────────
@app.route('/results')
def results():
    questions = load_data('quiz.json')
    answers = session.get('quiz_answers', {})
    hints_used = session.get('hints_used', [])
    mode = session.get('quiz_mode', 'normal')

    score = 0
    result_list = []
    topic_results = {}
    for i, q in enumerate(questions, 1):
        user_ans = answers.get(str(i), '')
        is_correct = user_ans == q['correct']
        if is_correct: score += 1
        topic = q.get('topic', 'General')
        if topic not in topic_results:
            topic_results[topic] = {'correct': 0, 'total': 0}
        topic_results[topic]['total'] += 1
        if is_correct: topic_results[topic]['correct'] += 1
        result_list.append({
            'num': i, 'question': q['question'],
            'user_answer': user_ans,
            'user_answer_text': q['options'].get(user_ans, 'Not answered'),
            'correct': q['correct'], 'correct_text': q['options'][q['correct']],
            'is_correct': is_correct, 'explanation': q['explanation'],
            'hint_used': i in hints_used, 'topic': q.get('topic', 'General')
        })

    # Save to history
    history = session.get('quiz_history', [])
    attempt = {
        'score': score, 'total': len(questions),
        'date': datetime.now().strftime('%b %d, %H:%M'),
        'mode': mode, 'hints': len(hints_used),
        'best_streak': session.get('best_streak', 0)
    }
    history.append(attempt)
    session['quiz_history'] = history

    return render_template('results.html',
        results=result_list, score=score, total=len(questions),
        topic_results=topic_results, hints_used=hints_used,
        mode=mode, attempt=attempt,
        best_streak=session.get('best_streak', 0),
        history=history)


# ── Glossary page ─────────────────────────────────────────────────────
@app.route('/glossary')
def glossary_page():
    terms = load_data('glossary.json')
    return render_template('glossary.html', terms=terms)


if __name__ == '__main__':
    app.run(debug=True)
