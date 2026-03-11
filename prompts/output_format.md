## Output Format

Respond with ONLY valid JSON in this exact format:
{
  "dimensions": {
    "decision_reversibility": {"level": "A|B|C|D", "reasoning": "one sentence"},
    "failure_blast_radius": {"level": "A|B|C|D", "reasoning": "one sentence"},
    "regulatory_exposure": {"level": "A|B|C|D", "reasoning": "one sentence"},
    "human_override_latency": {"level": "A|B|C|D", "reasoning": "one sentence"},
    "data_confidence": {"level": "A|B|C|D", "reasoning": "one sentence"},
    "accountability_chain": {"level": "A|B|C|D", "reasoning": "one sentence"},
    "graceful_degradation": {"level": "A|B|C|D", "reasoning": "one sentence"}
  },
  "interpretation": "one sentence overall readiness assessment"
}
