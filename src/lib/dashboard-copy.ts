type SearchFeedbackState = {
  type: "error" | "empty";
  message: string;
  code?: string;
};

type UploadFeedbackState = {
  message: string;
  code?: "MISSING_FILE" | "UNSUPPORTED_FILE" | "FILE_TOO_LARGE" | "UPLOAD_FAILED" | "PARSING_FAILED";
};

export function buildSearchFeedbackState(state: SearchFeedbackState) {
  if (state.code === "SEARCH_LIMIT_REACHED") {
    return {
      title: "Today's search limit has been reached",
      description: state.message,
      nextStep: "Review saved jobs or saved searches now, then come back tomorrow or upgrade for unlimited searches.",
      details: [
        "Your saved searches and shortlists still work as usual.",
        "Use today's saved jobs to decide what is worth applying to next.",
        "Upgrade when you want unlimited daily searching."
      ],
      variant: "warning" as const
    };
  }

  if (state.type === "error") {
    return {
      title: "Search unavailable right now",
      description: state.message,
      nextStep: "Try the same search again in a moment, or broaden the title and location filters.",
      details: [
        "Live job sources may be temporarily unavailable.",
        "If the issue continues, try a broader title or remove one strict filter."
      ],
      variant: "error" as const
    };
  }

  if (state.message.toLowerCase().includes("live job providers are temporarily unavailable")) {
    return {
      title: "Live providers are temporarily unavailable",
      description: state.message,
      nextStep: "Try again shortly or broaden your search with a wider title or country.",
      details: [
        "This usually clears on its own without any action on your side.",
        "You can also try a remote or worldwide search to widen coverage."
      ],
      variant: "warning" as const
    };
  }

  if (state.message.toLowerCase().includes("no live jobs matched")) {
    return {
      title: "No live jobs matched yet",
      description: state.message,
      nextStep: "Try a broader role title, switch to Worldwide, or remove one strict filter.",
      details: [
        "Start broad, then narrow after you see where live jobs are available.",
        "Adding one focused keyword can improve the next live result set."
      ],
      variant: "warning" as const
    };
  }

  return {
    title: "No jobs found yet",
    description: state.message,
    nextStep: "Broaden the role title, remove one strict filter, or try Worldwide for discovery.",
    details: [
      "Start broad, then narrow after you see where the strongest matches appear.",
      "Adding a relevant keyword can also improve the next result set."
    ],
    variant: "warning" as const
  };
}

export function buildUploadErrorState(state: UploadFeedbackState) {
  if (state.code === "PARSING_FAILED") {
    return {
      title: "We could not read the resume text",
      description: state.message,
      nextStep: "Export the resume again as a text-based PDF or DOCX file and upload it one more time.",
      details: [
        "Try saving the resume from Word or Google Docs again.",
        "If the PDF is scanned, use a version with selectable text."
      ],
      variant: "error" as const
    };
  }

  if (state.code === "FILE_TOO_LARGE") {
    return {
      title: "Resume upload did not complete",
      description: state.message,
      nextStep: "Use a smaller PDF or DOCX file and try the upload again.",
      details: ["Keep the file under 5MB.", "If your resume has images, try exporting a lighter PDF version."],
      variant: "error" as const
    };
  }

  if (state.code === "UNSUPPORTED_FILE") {
    return {
      title: "Resume upload did not complete",
      description: state.message,
      nextStep: "Choose a PDF or DOCX file and try again.",
      details: ["Use a PDF or DOCX file only.", "Avoid screenshots, scans, or image-only exports when possible."],
      variant: "error" as const
    };
  }

  return {
    title: "Resume upload did not complete",
    description: state.message,
    nextStep: "Choose a PDF or DOCX file and try the upload again.",
    details: undefined,
    variant: "error" as const
  };
}

export function buildSavedSearchSectionCopy(savedSearchCount: number, alertsEnabledOnPlan: boolean) {
  if (savedSearchCount === 0) {
    return alertsEnabledOnPlan
      ? "Save one strong search so you can come back to it without rebuilding every filter."
      : "Save one strong search now, then unlock alert delivery later if you upgrade.";
  }

  return alertsEnabledOnPlan
    ? "Saved searches keep your best filter sets ready, and alerts help you stay aware of new matches."
    : "Saved searches keep your best filter sets ready. Alerts unlock later on Pro.";
}
