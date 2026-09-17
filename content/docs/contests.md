# Writing contests

LixBlogs contests are time-bound publishing events. An organizer defines a theme, problem statement, rules, dates, eligibility, and optional writing template. Authors submit an already-published blog while keeping ownership, attribution, canonical URL, and license.

## Lifecycle

A contest moves through `draft`, `scheduled`, `live`, `judging`, and `completed`. An organizer may cancel it before completion. The public state advances from the configured dates even when no dashboard is open.

- **Draft:** visible only to the organizer, moderators, and judges.
- **Scheduled:** public, but submissions have not opened.
- **Live:** eligible authors may submit or withdraw before the deadline.
- **Judging:** submissions and withdrawals are closed; judges can read frozen revisions.
- **Completed:** placements and results are public and immutable through normal contest controls.

Dates become locked once the contest opens or receives its first submission. This prevents an organizer from silently changing the deadline after authors participate.

## Roles

The creator is the organizer. Only the organizer can assign or remove roles.

- **Moderators** maintain contest information and operational controls.
- **Judges** can retrieve frozen submission snapshots and select results.
- **Authors** can submit only their own public, non-secret blogs.

Every role change, submission, withdrawal, lifecycle transition, and result update is recorded in the contest audit log.

## Immutable submissions

Submitting stores the source blog ID and a frozen copy of its title, metadata, topics, license, and block content. Later edits to the public blog do not change what judges review. The gallery continues linking to the author's canonical blog and clearly labels the entry as frozen at submission.

Required topics, publication targets, and per-author limits are checked when the entry is submitted. A withdrawal is allowed only while the contest remains live.

## Results

The first release supports one winner plus runner-up and honorable-mention placements. Finalizing results closes the contest, notifies participants, and adds public contest recognition to the winning authors' profiles.

Community voting, automated judging, sponsors, monetary prizes, payouts, advanced rubrics, and anonymized judging are not part of this release.

## CLI automation

The CLI uses existing blog scopes. Reads require `lixblogs:blog:read`, contest and submission mutations require `lixblogs:blog:write`, and final results require `lixblogs:blog:publish`.

```bash
lixblogs contest list
lixblogs contest create \
  --title "Build for the open web" \
  --problem "Explain a practical improvement to the open web." \
  --rules "Submit original work published on LixBlogs." \
  --starts-at 2026-10-01T00:00:00Z \
  --submissions-close-at 2026-10-15T23:59:59Z \
  --judging-closes-at 2026-10-20T23:59:59Z \
  --tag open-web
lixblogs contest publish CONTEST_ID --yes
lixblogs contest submit CONTEST_ID --blog BLOG_ID
lixblogs contest submissions CONTEST_ID --snapshot --json
lixblogs contest results CONTEST_ID \
  --award winner:SUBMISSION_ID \
  --award runner-up:OTHER_SUBMISSION_ID \
  --finalize --yes
```

Use `--json --no-input` with a scoped personal access token for workflows. The API enforces the same ownership, role, deadline, and eligibility boundaries as the website.
Organization-scoped tokens cannot create or manage contests in this release; eligible organization-published entries can still be allowed explicitly by the organizer.
