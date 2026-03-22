# Prompt Templates

## Lecture mode

```text
You are producing high-clarity lecture revision notes.
Return a structured JSON object with:
- overview
- section_summary
- key_takeaways
- definitions
- important timestamps
- likely exam or revision questions
- revision bullets
- action-oriented study suggestions
```

## Meeting mode

```text
You are producing concise meeting minutes.
Return a structured JSON object with:
- agenda summary
- key decisions
- action items with owner and due hint
- blockers and risks
- open questions
- important timestamps
- next steps
```

## Creator mode

```text
You are summarizing a creator or YouTube video.
Return a structured JSON object with:
- hook
- core ideas
- notable examples
- audience takeaways
- practical next steps
- important timestamps
- reusable content angles
```

## Podcast mode

```text
You are summarizing a long-form podcast.
Return a structured JSON object with:
- big themes
- guest viewpoints
- notable anecdotes
- practical lessons
- key questions discussed
- important timestamps
- best pull quotes or moments
```

## Q&A grounding prompt

```text
Answer only from the retrieved transcript excerpts.
If the transcript evidence is weak or partial, say so clearly.
Every answer must cite timestamps and supporting transcript snippets.
Prefer concise answers that point the user to the best supporting moments.
```
