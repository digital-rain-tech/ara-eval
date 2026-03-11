# KPMG: Implications of Cross-Border Data Transfers for HK SAR-Based Financial Institutions

- **Source:** KPMG Advisory (Hong Kong) / SF Lawyers
- **Date:** September 2023
- **URL:** https://assets.kpmg.com/content/dam/kpmg/cn/pdf/en/2023/09/implications-of-cross-border-data-transfers-for-hksar-based-financial-institution.pdf
- **Archived:** 2026-03-11 (from manual PDF download `raw/implications-of-cross-border-data-transfers-for-hksar-based-financial-institution.pdf`, 5pp)

---

## Overview

A concise flyer covering key considerations and challenges in China's evolving data protection regulations as they affect Hong Kong SAR-based financial institutions conducting cross-border data transfers.

## Key Regulations Timeline

| Regulation | Date | Key Requirement |
|-----------|------|----------------|
| Cybersecurity Law (CSL) | Jun 2017 | Restrictions on transferring PI and business data overseas |
| Data Security Law (DSL) | Sep 2021 | Cross-Border Data Transfer (CBDT) requirements for CIIOs and important data |
| **Personal Information Protection Law (PIPL)** | **Nov 2021** | **Cross-border PI transfer guidance** |
| Measures for Cross-border Data Transfer Security Assessment | Sep 2022 | Key review aspects for CBDT self-assessment and CAC security assessment |
| PI Protection Certification | Nov 2022 | Standards for obtaining PI protection certification for cross-border transfers |
| **Measures for Standard Contracts (SCC)** | **Jun 2023** | **Compliance path for contract-based cross-border PI transfers** |
| GBA Data Security measures (draft) | Jul 2023 | Strengthened requirements for storing data within mainland China |
| Compliance audit measures (draft) | Aug 2023 | Periodic audit guidelines for PI processing activities |

## Three Compliance Paths for Cross-Border Transfers

Data processors must choose based on data type and volume:

1. **CAC Security Assessment** — required for: transfers of Important Data; OR processors with PI of 1M+ people transferring overseas; OR transferred 100K+ PI or 10K+ SPI since Jan 1 of previous year
2. **Standard Contract Clauses (SCC)** — below security assessment threshold
3. **PI Protection Certification** — alternative to SCC

## Data Categories
- **Personal Information (PI):** identified or identifiable natural persons
- **Sensitive Personal Information (SPI):** if disclosed/used illegally, could harm dignity, safety, or property
- **Important Data:** if tampered/destroyed/leaked, may pose threats to national security, economic operations, social stability, public health

## Cross-Border Scenarios for HK Financial Institutions
- Receiving regulated data from mainland counterpart (email, system, FTP)
- HK-based data centre collecting regulated data from mainland
- Mainland-based data centre with HK staff remotely accessing for maintenance

## Common Challenges
- No clear guidelines or protocols for managing cross-border transfers
- No holistic understanding of all cross-border transfer activities
- Fragmented management across departments/business units
- Privacy notices and DPAs not fully addressing cross-border requirements
- Systems may need localisation for compliance

## Relevance to ARA-Eval

Primary source for `cross-border-model-001` scenario. Key points:
- PIPL compliance paths are complex and depend on data volume thresholds
- Even model weights trained on mainland PI may trigger PIPL requirements
- HK financial institutions face dual-jurisdiction compliance challenges
- The 1M person threshold and SCC requirements directly inform the scenario's Regulatory Exposure = A rating
