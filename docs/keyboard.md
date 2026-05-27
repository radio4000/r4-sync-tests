# Keyboard shortcuts

Press `?` to open the shortcuts help dialog showing all available shortcuts.

Actions, default keys, labels, and handlers all live in one registry: `SHORTCUT_ACTIONS` in `$lib/keyboard.js`. Visit `/settings/keyboard` to customize. User overrides are stored in `appState.shortcuts`.

Default bindings: `/` search, `k` play/pause, `Shift+N` next track, `Shift+P` previous track, `s` shuffle, `r` compact deck, `g h` home, `g s` settings, `g d` docs, `?` shortcuts help.

The keyboard events are attached through `<KeyboardShortcuts>` in layout.svelte. The help dialog is `<ShortcutsDialog>` in layout-header.svelte. Both the dialog and editor read labels via `getActionLabel()` from `$lib/keyboard`.

## Adding a shortcut

1. Add an entry to `SHORTCUT_ACTIONS` with `default` (optional), `label` (optional), and `run`.
2. For the label, reuse an existing i18n key if the string already exists (e.g. player tooltips), otherwise add `shortcuts_action_<name>` to `i18n/messages/en.json` and the other locales.

That's it — the editor list, help dialog, and default key map all derive from the registry.

## Tracklist navigation

Arrow keys navigate tracklists — up/down to move between tracks, enter/space to play the selected track.
