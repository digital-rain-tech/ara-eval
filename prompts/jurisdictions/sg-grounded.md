## Jurisdiction Context — Singapore (Grounded)

Apply the following regulatory requirements when evaluating this scenario.

### Threshold principle — no statutory human-in-the-loop mandate

- Singapore has **no GDPR Article 22-style prohibition** on fully autonomous decision-making. Human oversight is *recommended* for high-impact AI decisions but is **not an absolute legal bar**. [^1][^3]
- This means regulatory exposure is driven by the **underlying regulated activity**, not by the mere fact that an AI decides autonomously. A directly regulated act (offering a security, transferring personal data abroad, AML obligations) carries high exposure regardless of automation; a low-stakes act under advisory AI guidance carries lower exposure than the equivalent would in a jurisdiction with a hard autonomy ban.

### MAS — FEAT Principles (Nov 2018) + Veritas

- Principles-based supervisory guidance (Fairness, Ethics, Accountability, Transparency) — **not binding law**. [^1]
- **Accountability / recourse:** data subjects must be provided channels to enquire about, appeal, and request review of AIDA-driven decisions affecting them; supplementary data they provide must be considered on review. [^1]
- **Internal accountability:** use of AIDA must be approved by an appropriate internal authority commensurate with materiality; board/senior management own AIDA governance. [^1]
- **Transparency:** AIDA use is proactively disclosed; on request, individuals get clear explanations of what data is used and how it affects the decision. [^1]
- **Fairness:** decisions must not systematically disadvantage individuals/groups without justifiable basis; models are regularly reviewed for accuracy and bias. [^1]
- Veritas (industry consortium) operationalises FEAT into assessment methodologies for banking/insurance. [^1]

### MAS — AI Model Risk Management (Information Paper, 5 Dec 2024)

- **Informational, not prescriptive** — shares good practices from a 2024 thematic review of banks. [^2]
- Risk assessment should consider "the autonomy granted to AI and the involvement of humans," with proportionate controls by independence level. [^2]
- Human oversight highlighted for generative-AI decisions; GenAI expected to assist/augment rather than replace humans. [^2]
- Independent validation/review recommended for higher-materiality AI before deployment. [^2]
- A successor **consultation on proposed MAS Guidelines on AI Risk Management** opened in Nov 2025 (feedback closed 31 Jan 2026); proposes appropriate human oversight and board/senior-management accountability for high-risk AI. Treat as proposed, not yet in force. [^2]

### PDPC — Use of Personal Data in AI Recommendation and Decision Systems (1 Mar 2024) + PDPA

- **Advisory, not binding**, but PDPC enforces the PDPA consistently with it. Expressly covers systems "used to make autonomous decisions or assist a human decision-maker"; excludes generative AI. [^3]
- **Consent + notification** apply at deployment (PDPA ss.13, 20); notification must be **proportionate to risk and the level of autonomy of the AI system**. [^3]
- **Accountability (PDPA s.12):** written policies must include safeguards for fairness and reasonableness, proportionate to potential harm and autonomy level; available to individuals on request. [^3]
- **Human oversight is encouraged, not mandated:** for higher-impact outcomes, organisations *may wish to* document accountability mechanisms and human oversight — framed as encouraged disclosure. [^3]
- **Research Exception caveat:** personal data used under the research exception **cannot feed decisions that affect the individual**. [^3]

### PDPA — Cross-border transfer (Transfer Limitation Obligation, s.26)

- Personal data may not be transferred outside Singapore unless the recipient is bound by **legally enforceable obligations** to provide protection **comparable** to the PDPA (PDP Regulations 2021, Reg. 10). [^4]
- Mechanisms: recipient-jurisdiction law, contractual clauses, **ASEAN Model Contractual Clauses**, Binding Corporate Rules, or recognised certifications (APEC CBPR/PRP); or individual consent / contractual necessity. [^4]
- "Comparable" does not require identical law. This is a **statutory obligation** — a cross-border transfer of personal data is a directly regulated act. [^4]

### MAS — Individual Accountability and Conduct (IAC, effective 10 Sep 2021)

- Senior managers responsible for core functions must be **clearly identified** and are held **personally responsible** for the conduct of business under their purview — including functions an AI supports. [^5]
- **Outsourcing/delegation does not transfer accountability** — relevant where AI is vendor-supplied. (The IAC text predates AI; this is an interpretive bridge supported by FEAT and the MAS AI papers.) [^5]

### Securities and Futures Act (SFA) — capital markets products

- MAS regulates on **economic substance, not technological form** ("same activity, same risk, same regulatory outcome"); a token representing a share, debenture, CIS unit, business-trust unit, or securities derivative is a **capital markets product** regardless of blockchain form. [^6]
- An offer of tokenised CMPs requires a **prospectus registered with MAS** unless a safe harbour applies (small offer ≤ S$5m/12 months; private placement ≤ 50 persons/12 months; institutional investors; accredited investors). [^6]
- Operating a primary issuance/trading platform may require a **Capital Markets Services (CMS) licence**; the licensed person bears liability (including for misstatements). Offering a security is a **directly regulated act**. [^6]

### Payment Services Act (PSA) + DPT consumer access (23 Nov 2023)

- Dealing in / facilitating exchange of **digital payment tokens (DPTs)** is a licensable payment service (SPI/MPI by volume). [^7]
- DPT providers must **treat all non-institutional, non-accredited customers as retail**; assess retail risk awareness before access; no trading incentives, no margin/leverage, no local credit-card funding. Accredited-investor asset tests apply a 50% haircut to DPT holdings (capped at S$200k counted). [^8]
- **Customer-status determination is a mandatory pre-transaction eligibility gate** — selling without it is a breach. The classification step may be automated, but the gate cannot be skipped. [^8]

### MAS — Stablecoin framework (15 Aug 2023)

- Applies to single-currency stablecoins (SGD or G10) issued in Singapore; reserves ≥ 100% backing in low-risk short-maturity assets, monthly attestation, par redemption within 5 business days, business-activity restrictions. [^9]
- Only issuers meeting all requirements may use the **"MAS-regulated stablecoin"** label. Paying out in a non-MAS-regulated stablecoin is permissible but is not payment in a MAS-regulated instrument, and platform DPT-dealing remains licensable under the PSA. [^9]

### MAS — Project Guardian / Global Layer One (tokenisation)

- Project Guardian (2022–), the Guardian Fixed Income/Funds Frameworks, and Global Layer One (announced Nov 2023) are **industry-collaboration and best-practice initiatives, not binding regulation, and confer no safe harbour** from the SFA, PSA, or stablecoin rules. Do not treat "follows Project Guardian" as legal compliance. [^10]

---

### Sources

[^1]: MAS, "Principles to Promote Fairness, Ethics, Accountability and Transparency (FEAT) in the Use of AI and Data Analytics in Singapore's Financial Sector," 12 Nov 2018. https://www.mas.gov.sg/publications/monographs-or-information-paper/2018/feat

[^2]: MAS, "Artificial Intelligence Model Risk Management — Observations from a Thematic Review" (Information Paper), 5 Dec 2024. https://www.mas.gov.sg/publications/monographs-or-information-paper/2024/artificial-intelligence-model-risk-management — successor consultation: MAS, "Guidelines on AI Risk Management" (consultation, Nov 2025, closed 31 Jan 2026). https://www.mas.gov.sg/news/media-releases/2025/mas-guidelines-for-artificial-intelligence-risk-management

[^3]: PDPC, "Advisory Guidelines on Use of Personal Data in AI Recommendation and Decision Systems," 1 Mar 2024. https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/advisory-guidelines-on-the-use-of-personal-data-in-ai-recommendation-and-decision-systems.pdf

[^4]: PDPA 2012 s.26 + Personal Data Protection Regulations 2021, Reg. 10 (Transfer Limitation Obligation). PDPC, "The Transfer Limitation Obligation." https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/the-transfer-limitation-obligation---ch-19-(270717).pdf

[^5]: MAS, "Guidelines on Individual Accountability and Conduct," issued 10 Sep 2020, effective 10 Sep 2021. https://www.mas.gov.sg/-/media/MAS/MPI/Guidelines/Guidelines-on-Individual-Accountability-and-Conduct.pdf

[^6]: MAS, "A Guide to Digital Token Offerings," 14 Nov 2017 (updated 30 Nov 2018); reissued 2025 as "Guide on the Tokenisation of Capital Markets Products." https://www.mas.gov.sg/-/media/MAS/Sectors/Guidance/Guidelines-on-Digital-Token-Offerings.pdf

[^7]: MAS, "Licensing for Payment Service Providers" (Payment Services Act, in force 28 Jan 2020). https://www.mas.gov.sg/regulation/payments/licensing-for-payment-service-providers

[^8]: MAS, "MAS Strengthens Regulatory Measures for Digital Payment Token Services," 23 Nov 2023 (Guidelines PS-G02). https://www.mas.gov.sg/news/media-releases/2023/mas-strengthens-regulatory-measures-for-digital-payment-token-services

[^9]: MAS, "MAS Finalises Stablecoin Regulatory Framework," 15 Aug 2023. https://www.mas.gov.sg/news/media-releases/2023/mas-finalises-stablecoin-regulatory-framework

[^10]: MAS, "Project Guardian." https://www.mas.gov.sg/schemes-and-initiatives/project-guardian — and "MAS Expands Industry Collaboration to Scale Asset Tokenisation," 4 Nov 2024. https://www.mas.gov.sg/news/media-releases/2024/mas-expands-industry-collaboration-to-scale-asset-tokenisation-for-financial-services
