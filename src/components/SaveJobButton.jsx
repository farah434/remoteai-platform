import { useState, useEffect } from "react";
import "./SaveJobButton.css";

export default function SaveJobButton({ job }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("savedJobs");
    try {
      const list = raw ? JSON.parse(raw) : [];
      setSaved(list.some((j) => j.id === job.id));
    } catch {
      setSaved(false);
    }
  }, [job.id]);

  const toggle = () => {
    const raw = localStorage.getItem("savedJobs");
    let list = [];
    try {
      list = raw ? JSON.parse(raw) : [];
    } catch {
      list = [];
    }

    if (saved) {
      const updated = list.filter((j) => j.id !== job.id);
      localStorage.setItem("savedJobs", JSON.stringify(updated));
      setSaved(false);
    } else {
      const entry = { ...job, savedAt: new Date().toISOString() };
      list.push(entry);
      localStorage.setItem("savedJobs", JSON.stringify(list));
      setSaved(true);
    }
  };

  return (
    <button
      className={`save-job-btn ${saved ? "save-job-btn--saved" : ""}`}
      onClick={toggle}
      title={saved ? "Unsave job" : "Save job"}
      aria-pressed={saved}
    >
      <svg
        className="save-job-btn__icon"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
