"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

interface RunSummary {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  model_requested: string;
  scenario_count: number;
  personality_count: number;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  metadata: string | null;
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((data) => {
        setRuns(data.runs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl p-4">
        <h1 className="mb-4 text-lg font-bold text-gray-100">Run History</h1>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : runs.length === 0 ? (
          <p className="text-gray-500">
            No runs found. Evaluate a scenario to create your first run.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Scenarios</th>
                  <th className="px-3 py-2">Success</th>
                  <th className="px-3 py-2">Tokens</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const meta = run.metadata
                    ? JSON.parse(run.metadata)
                    : {};
                  const source = meta.lab || "unknown";
                  const date = new Date(run.started_at);
                  return (
                    <tr
                      key={run.run_id}
                      className="border-b border-gray-800 hover:bg-gray-900/50"
                    >
                      <td className="px-3 py-2 text-gray-300">
                        <Link
                          href={`/history?id=${run.run_id}`}
                          className="hover:text-blue-400 hover:underline"
                        >
                          {date.toLocaleDateString()}{" "}
                          {date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">
                        {run.model_requested.length > 30
                          ? run.model_requested.slice(0, 30) + "..."
                          : run.model_requested}
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        {run.scenario_count}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            run.failed_calls > 0
                              ? "text-yellow-400"
                              : "text-green-400"
                          }
                        >
                          {run.successful_calls}/{run.total_calls}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        {(
                          run.total_input_tokens + run.total_output_tokens
                        ).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        ${run.total_cost_usd.toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        {run.total_duration_ms > 0
                          ? `${(run.total_duration_ms / 1000).toFixed(1)}s`
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {source}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
