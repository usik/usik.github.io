# EverStory competitor review — WHIF and Crack

Reviewed 2026-10-27. Public UI observations and official documentation only. No paid messages, account creation, private API inspection, or access-control circumvention. Product behavior below is documented, not independently verified end-to-end inside signed-in chats. Backend architecture and commercial success cannot be inferred from feature lists.

## Main finding

Both products package authored worlds, opening situations, player identities, persistent context, illustration libraries and progression around AI-generated dialogue. EverStory should improve the first-session experience and continuity alongside its pictures. A large catalog without a compelling opening is insufficient.

## WHIF

Public browser observations: first-run preference selection (BL, HL, both); discovery tabs for characters, ranking, playrooms, missions and worlds; creator handles, descriptive tags and conversation counts on cards. The inspected adult character page displayed an illustration count (14), relationship-score support, three authored opening situations, a full opening preview, creator play tips, suggested player personas, commands, comments and publicly shared short stories. Opening the album required sign-in. This is one character example; counts are not platform-wide defaults. Chat quality and paid features were not tested.

Official creator guide describes separately configured introductions, personas, character prompts, keyword-triggered lore, chapters, relationship levels with stage-specific behavior, context-dependent illustrations and commands. Official app description promotes novel-length narrative, a lighter DM mode, couple rooms, compatibility, missions and licensed characters. Current Korean app marketing and Japanese creator docs use different relationship-axis labels; do not assume one universal six-axis schema across all regions/versions.

The official image-generation beta announcement says it uses the character thumbnail as reference. The enabled-account scope, current price and image fidelity have not been verified.

Sources:
- https://www.whif.io/
- https://www.whif.io/characters/b47ec34f-d474-47ad-9af2-3ea8b9a37e24?es_type=carousel&es_detail=event
- https://note.com/whif_jp/n/nc38b34cc98bc
- https://slashpage.com/whif/n8pw9x2ze41q8mg7yrqv
- https://apps.apple.com/kr/app/id6753713932
- https://x.com/WHIF_official/status/2032054128617406848

## Crack

The public app returned “Please contact the site owner for access” in this cloud browser; functional findings rely on the official help center. This is a limitation of this verification environment, not evidence that the service is unavailable to normal users.

The creator workflow separates profile, story canon, named starting situations, stats, media, keyword book, shortcuts, endings and publication. Starting situations include an authored prologue, situational context and optional play guidance. Recommended replies can be authored (up to three) or generated.

Stats are configurable by story/starting situation, including affection, health or combat power, with thresholds that supply different behavior instructions. The documented ending system combines minimum turn count and optional stat conditions with an AI context check, awarding an ending card and epilogue. This is more structured than arbitrary endless chat.

Illustrations have two paths: AI chooses from uploaded context-tagged pictures; a message-level image button generates the current scene on demand. Current media guide describes a category × situation placement grid, bulk upload, and unlock hints. This is distinct from merely replacing a large static profile portrait. Exact limits are guide/version-specific.

Player controls include persona/profile, user notes, regenerating/editing messages, branching from an earlier message, novel UI/font settings, and an optional “continue” action with no typed input. The documented memory UI distinguishes short-term timeline, long-term records, relationships and current goals. Documentation says long-term entries can be added/edited; it does not establish perfect recall or disclose vector/embedding implementation.

The economy uses purchased/earned crackers, model-dependent message costs, optional additional output costs and generated images. Web and app prices differ; automatic purchase is documented. Official help pages contain inconsistent example prices, so use live checkout as authoritative and do not calculate a guaranteed cost per message here. Official creator benefits describe usage-related rewards and separate gift fees; those percentages are not the same as a general revenue-share percentage.

Sources:
- https://help.crack.wrtn.ai/
- https://help.crack.wrtn.ai/guide/user/tutorial/story
- https://help.crack.wrtn.ai/guide/user/tutorial/story/3
- https://help.crack.wrtn.ai/guide/user/tutorial/story/4
- https://help.crack.wrtn.ai/guide/user/tutorial/story/5
- https://help.crack.wrtn.ai/guide/user/tutorial/story/8
- https://help.crack.wrtn.ai/guide/user/image/situation-image
- https://help.crack.wrtn.ai/guide/user/story/auto-play
- https://help.crack.wrtn.ai/guide/creator/info/benefits

## Recommended EverStory order (product judgment)

1. Clear authored opening preview and the player's role; save and resume the first session reliably.
2. Inline context-matched illustrations with identity consistency and durable per-turn asset IDs.
3. Visible/editable player persona and important memories, then regenerate/edit and branch.
4. A small set of character-specific relationship axes and events with concrete consequences.
5. Authored alternate openings and achievable chapter endings, then gallery unlocks.
6. On-demand scene generation only after latency, identity fidelity and cost are measured.
7. Public creator studio, reward system and community only after the initial reading/chat loop is validated.

Do not copy competitors' art, character identities, prose or branded UI. Build original content and borrow the functional patterns.

## Current illustration implementation boundary

Ten character-specific emotion sets (warm, tense, vulnerable, resolute) plus existing neutral portraits. The dialogue model chooses an allowlisted emotion ID in structured output. It is persisted per turn and restored with history/export. Gallery is a labeled preview, not an unlock/reward system. These assets are expression portraits, not arbitrary newly generated plot scenes. Runtime image generation, numeric relationship progression, endings and branching are not implemented by this change.
