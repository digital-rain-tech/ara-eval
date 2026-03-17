"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";

interface RequestRow {
  id: string;
  created_at: string;
  run_id: string;
  model_requested: string;
  model_used: string | null;
  scenario_id: string | null;
  personality: string | null;
  response_status: number | null;
  error_message: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  response_time_ms: number | null;
  fingerprint_string: string | null;
  gating_classification: string | null;
  gating_rules_triggered: string | null;
  raw_request: string | null;
  raw_response: string | null;
  parsed_result: string | null;
  jurisdiction: string | null;
  rubric: string | null;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestRow | null>(null);

  // Filters
  const [scenarioFilter, setScenarioFilter] = useState("");
  const [personalityFilter, setPersonalityFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (scenarioFilter) params.set("scenarioId", scenarioFilter);
    if (personalityFilter) params.set("personality", personalityFilter);
    params.set("limit", "100");

    fetch(`/api/requests?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRequests(data.requests || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [scenarioFilter, personalityFilter]);

  // Load detail when selected
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetch(`/api/requests?id=${selectedId}`)
      .then((r) => r.json())
      .then((data) => setDetail(data.request || null));
  }, [selectedId]);

  const classificationColor = (c: string | null) => {
    if (!c) return "text-gray-500";
    if (c === "ready_now") return "text-green-400";
    if (c === "ready_with_prerequisites") return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl p-4">
        <h1 className="mb-4 text-lg font-bold text-gray-100">
          Request Inspector
        </h1>

        {/* Filters */}
        <div className="mb-4 flex gap-3">
          <input
            value={scenarioFilter}
            onChange={(e) => {
              setScenarioFilter(e.target.value);
              setLoading(true);
            }}
            placeholder="Filter by scenario ID..."
            className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600"
          />
          <input
            value={personalityFilter}
            onChange={(e) => {
              setPersonalityFilter(e.target.value);
              setLoading(true);
            }}
            placeholder="Filter by personality..."
            className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600"
          />
        </div>

        <div className="flex gap-4">
          {/* Table */}
          <div className={`${detail ? "w-1/2" : "w-full"} overflow-x-auto`}>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-500">No requests found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-gray-400">
                    <th className="px-2 py-2">Time</th>
                    <th className="px-2 py-2">Scenario</th>
                    <th className="px-2 py-2">Personality</th>
                    <th className="px-2 py-2">Fingerprint</th>
                    <th className="px-2 py-2">Classification</th>
                    <th className="px-2 py-2">Tokens</th>
                    <th className="px-2 py-2">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const date = new Date(req.created_at);
                    const isSelected = req.id === selectedId;
                    return (
                      <tr
                        key={req.id}
                        onClick={() =>
                          setSelectedId(isSelected ? null : req.id)
                        }
                        className={`cursor-pointer border-b border-gray-800 ${
                          isSelected
                            ? "bg-gray-800"
                            : "hover:bg-gray-900/50"
                        }`}
                      >
                        <td className="px-2 py-2 text-sm text-gray-400">
                          {date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-2 py-2 font-mono text-sm text-gray-300">
                          {req.scenario_id || "-"}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-400">
                          {req.personality || "-"}
                        </td>
                        <td className="px-2 py-2 font-mono text-sm text-gray-300">
                          {req.fingerprint_string || "-"}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`text-sm ${classificationColor(req.gating_classification)}`}
                          >
                            {req.gating_classification
                              ?.replace(/_/g, " ")
                              .toUpperCase() || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-400">
                          {req.total_tokens?.toLocaleString() || "-"}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-400">
                          {req.response_time_ms
                            ? `${(req.response_time_ms / 1000).toFixed(1)}s`
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail panel */}
          {detail && (
            <div className="w-1/2 overflow-y-auto rounded border border-gray-800 bg-gray-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-300">
                  Request Detail
                </h2>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-sm text-gray-500 hover:text-gray-300"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 text-sm">
                {/* Metadata */}
                <div className="space-y-1">
                  <Row label="ID" value={detail.id} />
                  <Row label="Created" value={detail.created_at} />
                  <Row label="Run ID" value={detail.run_id} />
                  <Row label="Scenario" value={detail.scenario_id} />
                  <Row label="Personality" value={detail.personality} />
                  <Row label="Model" value={detail.model_used || detail.model_requested} />
                  <Row label="Jurisdiction" value={detail.jurisdiction} />
                  <Row label="Status" value={String(detail.response_status)} />
                  <Row label="Fingerprint" value={detail.fingerprint_string} />
                  <Row
                    label="Classification"
                    value={detail.gating_classification}
                  />
                  <Row
                    label="Tokens"
                    value={
                      detail.total_tokens
                        ? `${detail.input_tokens} in / ${detail.output_tokens} out / ${detail.total_tokens} total`
                        : null
                    }
                  />
                  <Row
                    label="Latency"
                    value={
                      detail.response_time_ms
                        ? `${detail.response_time_ms}ms`
                        : null
                    }
                  />
                  <Row
                    label="Cost"
                    value={
                      detail.cost_usd != null
                        ? `$${detail.cost_usd.toFixed(6)}`
                        : null
                    }
                  />
                </div>

                {/* Error */}
                {detail.error_message && (
                  <div>
                    <h3 className="mb-1 font-medium text-red-400">Error</h3>
                    <pre className="whitespace-pre-wrap rounded bg-red-900/20 p-2 text-red-300">
                      {detail.error_message}
                    </pre>
                  </div>
                )}

                {/* Parsed result */}
                {detail.parsed_result && (
                  <div>
                    <h3 className="mb-1 font-medium text-gray-400">
                      Parsed Result
                    </h3>
                    <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded bg-gray-800 p-2 text-gray-300">
                      {JSON.stringify(
                        JSON.parse(detail.parsed_result),
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}

                {/* Raw request */}
                {detail.raw_request && (
                  <div>
                    <h3 className="mb-1 font-medium text-gray-400">
                      Raw Request
                    </h3>
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-gray-800 p-2 text-gray-300">
                      {JSON.stringify(
                        JSON.parse(detail.raw_request),
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}

                {/* Raw response */}
                {detail.raw_response && (
                  <div>
                    <h3 className="mb-1 font-medium text-gray-400">
                      Raw Response
                    </h3>
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-gray-800 p-2 text-gray-300">
                      {JSON.stringify(
                        JSON.parse(detail.raw_response),
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex">
      <span className="w-28 shrink-0 text-gray-500">{label}</span>
      <span className="font-mono text-gray-300">{value}</span>
    </div>
  );
}
