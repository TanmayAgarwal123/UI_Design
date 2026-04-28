# IB Academy

**What is Investment Banking?** — An interactive learning app built with Flask.

**Group:** Tanmay Agarwal (ta2830) · Edvard Tovmasyan (et2808) · Thomas Soltanian (trs2169)  
**TA:** Daniel Manjarrez · Spring 2026 · Columbia UI Design

---

## Setup & Run

```bash
# 1. Clone the repo
git clone <repo-url>
cd ib-academy

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py

# 4. Open in browser
# http://localhost:5000
```

---

## App Structure

```
ib-academy/
├── app.py                  # Flask backend — all routes
├── data/
│   ├── lessons.json        # All 16 lesson pages (content + type)
│   └── quiz.json           # 5 quiz questions
├── templates/
│   ├── base.html           # Shared navbar + Bootstrap imports
│   ├── home.html           # Landing page with Start button
│   ├── learn.html          # All lesson types (Jinja2 conditionals)
│   ├── quiz_intro.html     # Quiz intro screen
│   ├── quiz.html           # Quiz question page
│   └── results.html        # Score + breakdown
├── static/
│   ├── css/style.css       # IB Academy theme
│   └── js/main.js          # jQuery interactions
└── requirements.txt
```

---

## Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Home screen |
| `/start` | POST | Clears session, starts lesson 1 |
| `/learn/<n>` | GET | Render lesson n |
| `/learn/<n>` | POST | Store interaction data, advance |
| `/quiz` | GET | Quiz intro screen |
| `/quiz/<n>` | GET | Quiz question n |
| `/quiz/<n>` | POST | Store answer, advance |
| `/results` | GET | Score + breakdown |

---

## Data Stored in Session

- `start_time` — ISO timestamp when user clicked Start
- `page_visits` — `{lesson_num: ISO timestamp}` for every lesson visited
- `interactions` — `{lesson_num: {form_data}}` for every interactive lesson
- `quiz_answers` — `{q_num: "A"|"B"|"C"|"D"}` for each quiz question
