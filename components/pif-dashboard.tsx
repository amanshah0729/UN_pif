"use client"

import { useState } from "react"
import { ChatInterface } from "./chat-interface"
import { DocumentViewer } from "./document-viewer"

export function PifDashboard() {
  const [document, setDocument] = useState({
    title: "Project Information Form",
    sections: [
      {
        id: "executive-summary",
        title: "Executive Summary",
        content:
          "This project aims to address critical sustainable development goals through innovative partnerships and community engagement. The initiative will focus on building resilient infrastructure and promoting inclusive economic growth in underserved regions.",
      },
      {
        id: "project-objectives",
        title: "Project Objectives",
        content:
          "1. Enhance access to clean water and sanitation facilities\n2. Promote sustainable agricultural practices\n3. Strengthen local governance and institutional capacity\n4. Foster economic opportunities for marginalized communities",
      },
      {
        id: "implementation-strategy",
        title: "Implementation Strategy",
        content:
          "The project will be implemented in three phases over a 24-month period. Phase 1 focuses on stakeholder engagement and baseline assessments. Phase 2 involves infrastructure development and capacity building. Phase 3 emphasizes monitoring, evaluation, and knowledge transfer.",
      },
      {
        id: "budget",
        title: "Budget and Resources",
        content:
          "Total estimated budget: $2,500,000 USD\n\nBreakdown:\n- Infrastructure: $1,200,000\n- Capacity Building: $600,000\n- Monitoring & Evaluation: $400,000\n- Administrative Costs: $300,000",
      },
      {
        id: "expected-outcomes",
        title: "Expected Outcomes",
        content:
          "By the end of the project, we expect to reach 50,000 direct beneficiaries with improved access to essential services. The initiative will create 200 sustainable jobs and establish 15 community-led organizations capable of continuing the work beyond the project timeline.",
      },
    ],
  })

  return (
    <div className="flex h-screen bg-background">
      {/* Chat Interface - Left Side */}
      <div className="w-2/5 border-r border-border flex flex-col h-screen">
        <ChatInterface document={document} setDocument={setDocument} />
      </div>

      {/* Document Viewer - Right Side */}
      <div className="w-3/5 flex flex-col h-screen">
        <DocumentViewer document={document} />
      </div>
    </div>
  )
}
