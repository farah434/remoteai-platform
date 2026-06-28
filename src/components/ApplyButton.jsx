/**
 * ApplyButton.jsx — Phase 6 Part 3B
 * - Saves to appliedJobs in localStorage
 * - Changes state to "Applied ✓" after click
 * - Opens job.applyUrl in new tab if available
 * - Prevents duplicate applications
 */
import { useState, useEffect } from "react";
import "./ApplyButton.css";

export default function ApplyButton({ job }) {
  const [applied, setApplied] = useState(false);

  // Check if already applied on mount
  useEffect(() => {
    if (!job?.id && !job?._id) return;
    const id = job._id || job.id;
    try {
      const list = JSON.parse(localStorage.getItem("appliedJobs") || "[]");
      setApplied(list.some((j) => (j._id || j.id) === id));
    } catch {
      setApplied(false);
    }
  }, [job]);

  const handleApply = () => {
    if (applied) return;

    const id = job._id || job.id;

    // Save to appliedJobs localStorage
    try {
      const list = JSON.parse(localStorage.getItem("appliedJobs") || "[]");
      const alreadyApplied = list.some((j) => (j._id || j.id) === id);

      if (!alreadyApplied) {
        const entry = {
          id,
          _id: id,
          title: job.title,
          company: job.company,
          salary: job.salary || "",
          type: job.type || "",
          level: job.level || "",
          applyUrl: job.applyUrl || null,
          appliedAt: new Date().toISOString(),
          status: "pending",
        };
        list.push(entry);
        localStorage.setItem("appliedJobs", JSON.stringify(list));
      }
    } catch (e) {
      console.error("Failed to save application:", e);
    }

    setApplied(true);

    // Open company application page if URL exists
    if (job.applyUrl) {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      className={`apply-btn ${applied ? "apply-btn--applied" : ""}`}
      onClick={handleApply}
      disabled={applied}
      aria-pressed={applied}
      title={applied ? "Already applied" : job?.applyUrl ? "Apply on company website" : "Apply for this job"}
    >
      {applied ? (
        <>
          <svg viewBox="0 0 20 20" fill="currentColor" className="apply-btn__icon">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.707-4.707a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Applied
        </>
      ) : (
        <>
          Apply Now
          {job?.applyUrl && (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="apply-btn__icon apply-btn__icon--external">
              <path d="M11 3H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 3h3m0 0v3m0-3L10 10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </>
      )}
    </button>
  );
}
