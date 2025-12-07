/**
 * Special prompts for generating PIF sections
 * Each section will have 10 prompts that can be referenced during generation
 */

interface ScrapedData {
  institutional?: string;
  policy?: string;
  // Add more section-specific scraped data types as needed
}

/**
 * Generate prompt for "Institutional Framework for Climate Action" section
 */
export function getInstitutionalFrameworkPrompt(
  country: string,
  cbitInfo: string | null = null,
  scrapedData?: ScrapedData
): string {
  let institutionalFrameworkInstructions = `

Write the section "Institutional Framework for Climate Action" for ${country} following the official GEF8 PIF format.



Structure and tone requirements:

• The section should consist of: (1) an introduction paragraph, (2) a bulleted list of institutions and their roles, and (3) a conclusion paragraph.

• **Use bullet points only for listing institutions and their roles — do NOT use Markdown tables or numbering.**

• The section should read as a formal, factual summary appropriate for inclusion in a GEF Project Identification Form.



Content structure:



1. **Introductory paragraph (plain prose, no bullets)**

   - Describe the national legal and institutional foundation for climate governance and transparency.

   - Identify the lead ministry or agency responsible for coordinating national climate policy and reporting to the UNFCCC.

   - Explain this institution's role in preparing National Communications, Biennial Update Reports (BURs), and Biennial Transparency Reports (BTRs).

   - End with a transition statement like: "The following institutions play key roles in this framework:" or "Key institutions supporting this framework include:"



2. **Bulleted list of institutions and their roles (MUST BE EXPLICIT BULLET POINTS)**

   - Present institutions as a clear bulleted list covering the country's institutional framework for climate action.

   - Each bullet must start with '- ' or '• ' followed by **bolded institution name** in original language with acronym and English translation in brackets.

   - Format: '- **Institution Name (Acronym)** [English translation]: One-sentence description of primary role in climate action, MRV, or reporting.'

   - Each institution description should be concise (1 sentence per institution).

   - Cover multiple sectors as relevant to the country: agriculture, energy, transport, industry, finance, health, education, water, environment, etc.



3. **Concluding paragraph (plain prose, no bullets)**

   - Summarize the overall significance of this institutional framework for national sustainability, climate resilience, and transparency.

   - Highlight how these institutions work together to support the country's compliance with international reporting obligations under the UNFCCC and Paris Agreement.

   - Mention the importance of inter-ministerial coordination and data quality assurance.

`;

  // Add scraped UNFCCC data if available
  if (scrapedData?.institutional) {
    institutionalFrameworkInstructions += `\n\n**IMPORTANT: Extracted UNFCCC Data**

The following text was extracted from UNFCCC reports (BUR, BTR, NDC, NC) for ${country}. You MUST use this as the primary source of information and base your section on this extracted data:



${scrapedData.institutional}



Use this extracted data to inform the institutions, their roles, and the institutional framework structure. Ensure all information aligns with what was extracted from the official UNFCCC documents.`;
  }

  // Add CBIT information if available
  if (cbitInfo) {
    institutionalFrameworkInstructions += `\n\n**IMPORTANT: CBIT Project Information**

The following information is from a previous CBIT project for ${country}. You MUST incorporate relevant details from this CBIT project into the section, particularly:

- Any institutions that were established or strengthened through the CBIT project

- Capacity-building activities and their impact on the institutional framework

- MRV systems or transparency mechanisms developed under CBIT

- Coordination mechanisms that were enhanced through CBIT support



CBIT Project Information:

${cbitInfo}



Ensure that the CBIT project's contributions to the institutional framework are naturally integrated into the section narrative.`;
  }

  return institutionalFrameworkInstructions;
}

/**
 * Generate prompt for "National Policy Framework" section
 */
export function getNationalPolicyFrameworkPrompt(
  country: string,
  cbitInfo: string | null = null,
  scrapedData?: ScrapedData
): string {
  let nationalPolicyInstructions = `

Write the section "National Policy Framework" for ${country} following the official GEF8 PIF format. This section focuses on specific LAWS, POLICIES, DECREES, and STRATEGIES—not on institutional frameworks or organizational structures.



SOURCE AND RECENCY REQUIREMENTS:

• Include policies and laws from the APPROVED SOURCES:

  - UNFCCC (unfccc.int)

  - ICAT (Initiative for Climate Action Transparency)

  - PATPA (Partnership for Transparency in the Paris Agreement)

  - GEF/CBIT (Global Environment Facility / Capacity-Building Initiative for Transparency)

  - The target country's official national climate, environment, or energy ministry website

• Prioritize recent policies (2020-2025 where possible), but policies from approved sources that are foundational to the country's climate framework may be included if they are still in force.

• Only include policies you can verify from these sources. If you cannot verify a policy, do not include it.



Formatting and tone:

• Use an explicit bulleted list for the main policy and legal instruments. Each bullet must begin with a dash and a single space (e.g. - ), then the policy or law title in bold followed by a colon, and then a short description of the instrument (maximum 3 sentences per bullet).

  - Example: - **Decree 86 (2019):** One-sentence summary of the decree's objectives. Second sentence on scope/focus areas if needed.

• **CRITICAL: The opening paragraph and concluding paragraph must NEVER be in bullet point format and must NEVER contain any bold text. These are plain flowing paragraphs. Bold formatting should ONLY appear in the policy names within the bullet list items.**

• Maintain a formal, factual tone suitable for inclusion in a GEF Project Identification Form (PIF).

• DO NOT include descriptions of institutional roles or organizational structures in this section; focus ONLY on the content, objectives, and scope of the laws, policies, and strategies themselves.

• After the bullet list, include a short concluding synthesis paragraph (1–2 paragraphs) summarizing the framework and outstanding challenges.



Content structure:



1. **Opening paragraph (plain text paragraphs ONLY, NO BULLETS, NO BOLD)**

   - Write this as continuous flowing prose, NOT as bullet points.

   - DO NOT USE BULLETS HERE.

   - DO NOT BOLD any words or phrases in this paragraph.

   - Begin with one concise paragraph summarizing the country's overall policy and legal framework for climate action and how it aligns with international commitments such as the UNFCCC and the Paris Agreement.

   - End the paragraph with a transition like: "The following key instruments form the foundation of this framework:"



2. **Policy and legal instruments (present as explicit bullets, EACH AS ITS OWN BULLET) — FOCUS ON LAWS AND POLICIES, NOT INSTITUTIONS**

  - CRITICAL: Each law, decree, plan, or strategy MUST be output as a separate bullet line. DO NOT group multiple policies into one bullet.

  - For each law, decree, plan, or strategy, output a single bullet line in the following exact format:

    - **[Full name and year]:** [1–3 sentence description of objectives, focus areas (adaptation, mitigation, MRV, governance), and key provisions.]

  - Include the country's key foundational climate policies and laws from approved sources that are still in force.

  - Aim for a comprehensive list of the country's climate policy instruments (8–12+ where available, but include all that are verifiable and relevant).



3. **Concluding synthesis paragraph (plain text paragraphs ONLY, NO BULLETS, NO BOLD)**

   - Write this as continuous flowing prose, NOT as bullet points.

   - Summarize:

     • The overall significance of this policy framework for national sustainability, climate resilience, and transparency.  

     • Persistent challenges such as limited technical capacity, financing gaps, or MRV system limitations.  

     • The need to regularly update policies and laws to ensure consistency with international commitments and the Enhanced Transparency Framework (ETF).

   - DO NOT BOLD any words or phrases in this concluding paragraph.

   - DO NOT FORMAT this as bullet points; use flowing prose.

`;

  // Add scraped UNFCCC data if available
  if (scrapedData?.policy) {
    nationalPolicyInstructions += `\n\n**IMPORTANT: Extracted UNFCCC Data**

The following text was extracted from UNFCCC reports (BUR, BTR, NDC, NC) for ${country}. You MUST use this as the primary source of information and base your section on this extracted data:



${scrapedData.policy}



Use this extracted data to inform the policies, laws, decrees, and strategies. Ensure all information aligns with what was extracted from the official UNFCCC documents.`;
  }

  // Add CBIT information if available
  if (cbitInfo) {
    nationalPolicyInstructions += `\n\n**IMPORTANT: CBIT Project Information**

The following information is from a previous CBIT project for ${country}. You MUST incorporate relevant details from this CBIT project into the section, particularly:

- Any policies, laws, or strategies that were developed or strengthened through the CBIT project

- Policy frameworks or legal instruments that were created to support transparency and MRV systems under CBIT

- National policies that were aligned with the Enhanced Transparency Framework (ETF) as part of CBIT activities

- Any decrees, regulations, or strategic plans that emerged from or were informed by CBIT capacity-building efforts



CBIT Project Information:

${cbitInfo}



Ensure that the CBIT project's contributions to the policy framework are naturally integrated into the section narrative, particularly in the bullet list of policy instruments and in the concluding paragraph.`;
  }

  return nationalPolicyInstructions;
}

/**
 * Get additional context for a section if available
 * Returns the additional context string or null if no context is available
 */
export function getSectionAdditionalContext(
  sectionTitle: string,
  country: string,
  cbitInfo: string | null = null,
  scrapedData?: ScrapedData
): string | null {
  // Normalize section title for matching
  const normalizedTitle = sectionTitle.toLowerCase().trim();
  
  // Map section titles to their corresponding prompt functions
  if (normalizedTitle.includes('institutional framework') || normalizedTitle.includes('institutional framework for climate action')) {
    return getInstitutionalFrameworkPrompt(country, cbitInfo, scrapedData);
  }
  
  if (normalizedTitle.includes('national policy') || normalizedTitle.includes('national policy framework')) {
    return getNationalPolicyFrameworkPrompt(country, cbitInfo, scrapedData);
  }
  
  // No additional context available for this section
  return null;
}

