from __future__ import annotations

from app.models.entities import OutputMode
from app.services.chunking import format_bullets


def build_demo_transcript(title: str, mode: OutputMode) -> str:
    common = [
        f"This session focuses on {title} and follows a clear beginning, middle, and closing recap.",
        "The speaker starts with context, constraints, and the outcome the audience should leave with.",
        "Examples are used to explain implementation tradeoffs, operational risks, and practical next steps.",
        "Several moments highlight definitions, recurring themes, and references worth revisiting later.",
        "The end of the recording consolidates key takeaways, action items, and unanswered questions.",
    ]

    mode_specific = {
        OutputMode.lecture: [
            "The instructor revisits foundational concepts, definitions, and likely exam-style questions.",
            "Short revision cues are repeated so learners can convert the lecture into study notes.",
        ],
        OutputMode.meeting: [
            "Participants align on decisions, owners, delivery timing, and unresolved dependencies.",
            "Follow-ups are framed as concrete tasks with lightweight accountability and next review points.",
        ],
        OutputMode.creator: [
            "The presenter structures the narrative around a hook, practical examples, and audience value.",
            "The content balances explanation with memorable moments designed for retention and sharing.",
        ],
        OutputMode.podcast: [
            "The conversation moves through stories, lessons learned, strategic opinions, and useful mental models.",
            "Long-form anecdotes are used to support broader themes and reflective takeaways.",
        ],
    }

    blocks = common + mode_specific[mode]
    return " ".join(blocks * 16)


def build_demo_summary(title: str, mode: OutputMode) -> dict:
    mode_labels = {
        OutputMode.lecture: "lecture revision",
        OutputMode.meeting: "meeting minutes",
        OutputMode.creator: "creator content",
        OutputMode.podcast: "podcast analysis",
    }

    questions = {
        OutputMode.lecture: [
            "Which concepts are most likely to appear in an exam or revision session?",
            "How do the core ideas connect to the real-world examples shown in the lecture?",
        ],
        OutputMode.meeting: [
            "What was agreed, and who owns the next steps?",
            "Which blockers still need clarification before delivery?",
        ],
        OutputMode.creator: [
            "What are the strongest audience takeaways from the video?",
            "Which examples best support the creator's central message?",
        ],
        OutputMode.podcast: [
            "What recurring themes shaped the discussion?",
            "Which stories or arguments best explain the guest's viewpoint?",
        ],
    }

    decisions = {
        OutputMode.lecture: [
            "Organize the material into revision-friendly sections instead of a raw transcript dump.",
            "Highlight concepts, definitions, and timestamps together for faster recall.",
        ],
        OutputMode.meeting: [
            "Prioritize reliability and transcript-grounded answers before adding advanced automation.",
            "Track follow-up work as explicit action items with owners and due hints.",
        ],
        OutputMode.creator: [
            "Keep the summary audience-facing and focused on reusable insights.",
            "Preserve moments that are strong hooks, examples, or narrative pivots.",
        ],
        OutputMode.podcast: [
            "Capture big themes first, then attach supporting moments and anecdotes.",
            "Separate story beats from practical takeaways so the output is easy to skim.",
        ],
    }

    definitions = {
        OutputMode.lecture: [
            {"term": "Retrieval-augmented generation", "definition": "Answer generation that is grounded in retrieved transcript chunks."},
            {"term": "Transcript chunk", "definition": "A timestamped segment that can be searched, embedded, and cited."},
            {"term": "Revision note", "definition": "A condensed explanation optimized for review instead of first-time learning."},
        ],
        OutputMode.meeting: [
            {"term": "Decision log", "definition": "A concise record of what the group agreed to and why it matters."},
            {"term": "Action item", "definition": "A next step that can be owned, tracked, and completed."},
        ],
        OutputMode.creator: [
            {"term": "Hook", "definition": "The opening framing that wins attention and defines why the content matters."},
            {"term": "Audience takeaway", "definition": "A point the viewer can immediately apply or remember after the video ends."},
        ],
        OutputMode.podcast: [
            {"term": "Theme", "definition": "A recurring idea that appears across multiple parts of the conversation."},
            {"term": "Anecdote", "definition": "A specific story used to make a broader argument more concrete."},
        ],
    }

    return {
        "overview": f"{title} has been processed in {mode_labels[mode]} mode with timestamp-aware notes, grounded citations, and structured outputs.",
        "section_summary": [
            {"title": "Opening context", "summary": "The recording frames the topic, goals, and why the material matters."},
            {"title": "Core discussion", "summary": "Most of the session focuses on explanations, examples, and tradeoffs."},
            {"title": "Closing recap", "summary": "The ending reinforces takeaways, next steps, and questions worth revisiting."},
        ],
        "key_takeaways": [
            "The content has a clear narrative shape, which makes it suitable for structured note extraction.",
            "Important timestamps can be used as a fast navigation layer for review and collaboration.",
            "Grounded answers work best when transcript chunks stay small, labeled, and linked to evidence.",
        ],
        "questions_discussed": questions[mode],
        "key_decisions": decisions[mode],
        "definitions": definitions[mode],
        "exam_notes": [
            "Focus on definitions, tradeoffs, and the examples that reinforce the main concept.",
            "Use the timestamps as anchors for targeted revision instead of replaying the entire session.",
        ]
        if mode == OutputMode.lecture
        else [],
        "meeting_minutes": [
            "Agenda reviewed and aligned.",
            "Decisions recorded with rationale.",
            "Follow-up owners confirmed.",
        ]
        if mode == OutputMode.meeting
        else [],
        "bullet_summary_markdown": format_bullets(
            [
                "Clean note structure generated from a long-form transcript.",
                "Important timestamps grouped into a quick review timeline.",
                "Tasks, questions, and decisions extracted into separate sections.",
            ]
        ),
        "mode": mode.value,
        "qa_guidance": "Cite the smallest relevant transcript spans and say when the evidence is partial.",
    }
