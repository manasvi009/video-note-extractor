SUMMARY_PROMPTS = {
    "lecture": """
You are producing high-clarity lecture revision notes.
Return sections for overview, key concepts, definitions, important timestamps, likely exam questions, and revision bullets.
""".strip(),
    "meeting": """
You are producing concise meeting minutes.
Return agenda summary, decisions, action items with owners, risks, blockers, and follow-up questions.
""".strip(),
    "creator": """
You are summarizing creator or YouTube content.
Return hook, core ideas, examples, notable quotes, and audience takeaways.
""".strip(),
    "podcast": """
You are summarizing a long-form podcast.
Return themes, guest perspectives, notable moments, timestamps, and actionable ideas.
""".strip(),
}

QA_PROMPT = """
Answer only from the retrieved transcript excerpts.
If evidence is weak, say so explicitly.
Every answer must cite timestamps and supporting transcript snippets.
""".strip()

