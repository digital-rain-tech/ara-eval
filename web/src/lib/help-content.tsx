/**
 * Context-sensitive help content for all UI elements.
 * Rendered inside HelpTip popovers.
 */

import type { Dimension, GatingClassification } from "./constants";

function Row({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="mt-1">
      <span className="font-semibold text-gray-200">{label}</span>
      <span className="text-gray-400"> — {desc}</span>
    </div>
  );
}

function Level({
  level,
  desc,
  gate,
}: {
  level: string;
  desc: string;
  gate?: string;
}) {
  return (
    <div className="mt-1 flex gap-1.5">
      <span className="w-4 shrink-0 font-mono font-bold text-gray-200">
        {level}
      </span>
      <span className="text-gray-400">
        {desc}
        {gate && (
          <span className="ml-1 rounded bg-red-900/50 px-1 text-[10px] font-semibold uppercase tracking-wide text-red-400">
            hard gate
          </span>
        )}
      </span>
    </div>
  );
}

export const HELP = {
  groundingLevel: (
    <div>
      <p className="font-semibold text-gray-200">Grounding Level</p>
      <p className="mt-1 text-gray-400">
        How much regulatory context is injected into the evaluation prompt.
      </p>
      <Row label="Generic" desc="Universal AI risk principles, no specific jurisdiction." />
      <Row label="HK" desc="Adds Hong Kong framework names: HKMA, SFC, PCPD, PIPL." />
      <Row
        label="HK Grounded"
        desc="Verbatim regulatory text included — highest accuracy, more tokens used."
      />
    </div>
  ),

  inputMode: (
    <div>
      <p className="font-semibold text-gray-200">Input Mode</p>
      <p className="mt-1 text-gray-400">
        How the scenario is formatted before being sent to the model.
      </p>
      <Row
        label="Unstructured"
        desc="Full narrative sent as one block of text. Faster, less consistent."
      />
      <Row
        label="Structured"
        desc="Scenario decomposed into 8 labelled fields. More consistent results."
      />
      <Row label="Free Text" desc="Paste your own scenario description." />
      <Row
        label="Structured Form"
        desc="Fill each field manually for maximum precision."
      />
    </div>
  ),

  model: (
    <div>
      <p className="font-semibold text-gray-200">Model</p>
      <p className="mt-1 text-gray-400">
        The LLM that performs the risk evaluation via OpenRouter. Only free
        models (<code className="text-gray-300">:free</code> suffix) are
        permitted on this app.
      </p>
      <p className="mt-2 text-gray-400">
        <span className="font-semibold text-gray-200">Arcee Trinity</span> is
        the default — tested at 100% completion across 18 benchmark scenarios
        with consistent, calibrated behaviour.
      </p>
    </div>
  ),

  dimensions: {
    decision_reversibility: (
      <div>
        <p className="font-semibold text-gray-200">Decision Reversibility</p>
        <p className="mt-1 text-gray-400">How easily can the decision be undone after the fact?</p>
        <Level level="A" desc="Irreversible — e.g. trade execution, asset transfer" />
        <Level level="B" desc="Hard to reverse — manual intervention, customer impact" />
        <Level level="C" desc="Easily reversible — straightforward, contained correction" />
        <Level level="D" desc="Fully reversible — auto-rollback, no user impact" />
      </div>
    ),
    failure_blast_radius: (
      <div>
        <p className="font-semibold text-gray-200">Failure Blast Radius</p>
        <p className="mt-1 text-gray-400">How many users or systems are affected if the agent makes the wrong call?</p>
        <Level level="A" desc="Systemic — market-wide or regulatory-wide impact" gate="true" />
        <Level level="B" desc="Multi-customer — group or significant financial exposure" />
        <Level level="C" desc="Single-customer — contained to one account" />
        <Level level="D" desc="Internal / test — no external impact" />
      </div>
    ),
    regulatory_exposure: (
      <div>
        <p className="font-semibold text-gray-200">Regulatory Exposure</p>
        <p className="mt-1 text-gray-400">Does this decision fall under a specific regulatory requirement?</p>
        <Level level="A" desc="Direct mandate — human-in-loop required by law" gate="true" />
        <Level level="B" desc="Regulatory guidance applies, not prescriptive" />
        <Level level="C" desc="General compliance — standard business regulations" />
        <Level level="D" desc="Unregulated domain — internal tooling, no framework" />
      </div>
    ),
    human_override_latency: (
      <div>
        <p className="font-semibold text-gray-200">Decision Time Pressure</p>
        <p className="mt-1 text-gray-400">How much time is available for a human to intervene?</p>
        <Level level="A" desc="No time — real-time decisions; human physically impossible" />
        <Level level="B" desc="Hours — delay creates material risk" />
        <Level level="C" desc="Days acceptable — normal review workflows" />
        <Level level="D" desc="No deadline — can wait weeks or indefinitely" />
      </div>
    ),
    data_confidence: (
      <div>
        <p className="font-semibold text-gray-200">Data Confidence</p>
        <p className="mt-1 text-gray-400">How reliable and complete is the input data the agent acts on?</p>
        <Level level="A" desc="Ambiguous / conflicting signals" />
        <Level level="B" desc="Partial signal — key inputs uncertain" />
        <Level level="C" desc="Strong signal with known caveats" />
        <Level level="D" desc="High-confidence structured data" />
      </div>
    ),
    accountability_chain: (
      <div>
        <p className="font-semibold text-gray-200">Accountability Chain</p>
        <p className="mt-1 text-gray-400">Can you trace who or what is responsible for this decision after the fact?</p>
        <Level level="A" desc="No clear accountability — opaque model inference chain" />
        <Level level="B" desc="Accountability exists but audit trail incomplete" />
        <Level level="C" desc="Clear accountability with documented audit trail" />
        <Level level="D" desc="Full transparency — complete, human-readable audit" />
      </div>
    ),
    graceful_degradation: (
      <div>
        <p className="font-semibold text-gray-200">Graceful Degradation</p>
        <p className="mt-1 text-gray-400">What happens when the agent fails or encounters an edge case?</p>
        <Level level="A" desc="Cascading failure — downstream systems affected silently" />
        <Level level="B" desc="Ungraceful failure — requires manual database intervention" />
        <Level level="C" desc="Contained failure — limited, recoverable damage" />
        <Level level="D" desc="Safe failure — falls back to human queue, no data loss" />
      </div>
    ),
  } as Record<Dimension, React.ReactNode>,

  fingerprintString: (
    <div>
      <p className="font-semibold text-gray-200">Risk Fingerprint</p>
      <p className="mt-1 text-gray-400">
        A 7-letter code encoding the risk level for each dimension in order:
      </p>
      <p className="mt-2 font-mono text-xs text-gray-300">
        Rev · Blast · Reg · Time · Data · Acct · Degrade
      </p>
      <p className="mt-2 text-gray-400">
        <span className="font-semibold text-red-400">A</span> = highest risk,{" "}
        <span className="font-semibold text-green-400">D</span> = lowest. A hard
        gate triggers if position 2 (Blast) or position 3 (Regulatory) = A.
      </p>
    </div>
  ),

  gatingVerdict: {
    human_in_loop_required: (
      <div>
        <p className="font-semibold text-red-400">Human-in-Loop Required</p>
        <p className="mt-1 text-gray-400">
          A <span className="font-semibold text-gray-200">hard gate</span> was
          triggered. Either Regulatory Exposure = A or Blast Radius = A.
          Autonomous deployment is not permitted regardless of all other
          dimensions. A human must remain in the decision loop.
        </p>
      </div>
    ),
    ready_with_prerequisites: (
      <div>
        <p className="font-semibold text-yellow-400">Ready with Prerequisites</p>
        <p className="mt-1 text-gray-400">
          Soft gates were triggered. Autonomy is possible if specific conditions
          are met — such as documented risk acceptance from an appropriate
          authority, a complete audit trail, or real-time human monitoring.
        </p>
      </div>
    ),
    ready_now: (
      <div>
        <p className="font-semibold text-green-400">Ready Now</p>
        <p className="mt-1 text-gray-400">
          No gates were triggered and all dimensions are C or better. This
          scenario is a strong candidate for full autonomous deployment.
        </p>
      </div>
    ),
  } as Record<GatingClassification, React.ReactNode>,

  personalityDelta: (
    <div>
      <p className="font-semibold text-gray-200">Stakeholder Disagreements</p>
      <p className="mt-1 text-gray-400">
        Dimensions where the three stakeholder perspectives assigned different
        risk levels. High disagreement signals genuine ambiguity in the scenario
        — exactly where human governance decisions need to be made explicitly
        rather than delegated to the model.
      </p>
    </div>
  ),

  personalities: {
    compliance_officer: (
      <div>
        <p className="font-semibold text-gray-200">Risk-Averse Compliance Officer</p>
        <p className="mt-1 text-gray-400">
          Evaluates from a regulatory compliance perspective. Represents the
          &ldquo;never get fined&rdquo; stakeholder. Tends to classify higher risk (more A/B
          levels).
        </p>
      </div>
    ),
    cro: (
      <div>
        <p className="font-semibold text-gray-200">Aggressive CRO</p>
        <p className="mt-1 text-gray-400">
          Chief Risk Officer balancing risk against business opportunity. More
          likely to accept soft gates with documented prerequisites.
        </p>
      </div>
    ),
    operations_director: (
      <div>
        <p className="font-semibold text-gray-200">Neutral Operations Director</p>
        <p className="mt-1 text-gray-400">
          Focused on practical execution. Least likely to over-classify; most
          concerned with what can realistically be implemented and monitored.
        </p>
      </div>
    ),
  } as Record<string, React.ReactNode>,

  agentMode: (
    <div>
      <p className="font-semibold text-gray-200">Agent Mode</p>
      <p className="mt-1 text-gray-400">
        Chat with an AI playing the role of the autonomous agent described in
        the scenario. Red-team its guardrails — try to get it to take actions it
        shouldn&apos;t. Useful for stress-testing decision boundaries.
      </p>
    </div>
  ),

  judgeMode: (
    <div>
      <p className="font-semibold text-gray-200">Judge Mode</p>
      <p className="mt-1 text-gray-400">
        Chat with the ARA evaluation judge directly. Ask it to explain a
        classification, challenge its reasoning on a specific dimension, or
        evaluate a scenario you describe in your own words.
      </p>
    </div>
  ),
};
