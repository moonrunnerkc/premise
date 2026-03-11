# Debrief Follow-Through Instructions

After running `premise-debrief`, the orchestrator must update the Notion workspace to close the feedback loop. This is what makes the Scenario Database a living record of prediction vs. reality.

## Update Sequence

### 1. Create Debrief Page

Create a new page as a child of the Premise parent page:
- Title: "Debrief: [Date]"
- Content sections:
  - **Outcome Summary**: From `outcome_summary`
  - **Prep vs. Reality**: Format as a comparison table
    - Position accuracy
    - Scenario accuracy
    - Simulation accuracy
  - **Lessons Learned**: Bulleted list from `lessons` array
  - **Pattern Update**: From `pattern_update`
  - **Effectiveness Score**: Display as "[score]/10"

### 2. Update Scenario Database Entries

For each item in `scenario_verdicts`:

1. Find the matching scenario entry in the database by its title or ID
2. Set the **Outcome** property:
   - "happened" -> "Happened"
   - "partially_happened" -> "Partially Happened"
   - "did_not_happen" -> "Did Not Happen"
   - "happened_differently" -> "Happened Differently"
3. Update the **Debrief Notes** rich text property with the verdict's `notes`
4. Add a Notion comment on the entry with a brief summary of what happened vs. what was predicted

### 3. Update Parent Page

Add a banner or callout block at the top of the parent Premise page:

> **Debrief Complete** (Effectiveness: [score]/10)
>
> [One-sentence outcome summary]

### 4. (Optional) Add Simulation Comparison Notes

If `simulation_comparison` data is available, add to the Simulation Log page:
- Which round was most realistic
- Which round was least realistic
- How accurate the counterparty simulation was

## Error Handling

If any Notion update fails:
- Log the error
- Continue with remaining updates
- Report to the user which updates succeeded and which failed
- Offer to retry the failed updates

The debrief data is already stored in the Debrief page, so individual scenario update failures do not lose the analysis.
