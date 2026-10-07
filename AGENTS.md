<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Talent identity is public.profiles; there is no external identity link or OAuth to ArtistrySynk. Why: one identity per person, owned by the parent platform data model.
- Public talent reads go only through talent_directory / talent_profile / talent_disciplines security-definer routines (src/lib/talent.ts). Why: safe-column projection with database-side filtering and pagination.
- verification_status and featured_until are guarded by profiles_guard_identity; featured is derived from featured_until, never a verification value. Why: trust fields must not be self-assigned.
- Profile photos live in the private avatars bucket, stored in avatar_url as `avatars:<path>` and resolved via signed URLs. Why: workspace blocks public buckets.
- Shared BrandLogo selects artwork by the explicit surface prop; Wordmark reuses it across navigation and account pages. Why: consistent background-specific logo placement without altering sponsor records.
