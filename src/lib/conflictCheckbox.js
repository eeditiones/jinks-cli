import {
    createPrompt,
    useState,
    useKeypress,
    usePrefix,
    usePagination,
    useMemo,
    makeTheme,
    isUpKey,
    isDownKey,
    isSpaceKey,
    isEnterKey,
    ValidationError,
    Separator,
} from '@inquirer/core';
import chalk from 'chalk';
import figures from '@inquirer/figures';
import { diffLines } from 'diff';

const conflictCheckboxTheme = {
    icon: { cursor: figures.pointer },
};

// A checkbox prompt for resolving conflicts, extending @inquirer/checkbox with a
// 'v' shortcut that fetches and renders a diff between the current (local/server)
// content and the incoming content for the highlighted conflict, inline below the list.

function isSelectable(item) {
    return !Separator.isSeparator(item) && !item.disabled;
}

function isNavigable(item) {
    return !Separator.isSeparator(item);
}

function isChecked(item) {
    return !Separator.isSeparator(item) && item.checked;
}

function toggle(item) {
    return isSelectable(item) ? { ...item, checked: !item.checked } : item;
}

function check(checked) {
    return function (item) {
        return isSelectable(item) ? { ...item, checked } : item;
    };
}

function isEscapeKey(key) {
    return key.name === 'escape';
}

function normalizeChoices(choices) {
    return choices.map((choice) => {
        if (Separator.isSeparator(choice)) return choice;
        const name = choice.name ?? String(choice.value);
        return {
            value: choice.value,
            name,
            short: choice.short ?? name,
            disabled: choice.disabled ?? false,
            checked: choice.checked ?? false,
        };
    });
}

export async function fetchCurrentContent(client, conflict) {
    try {
        const response = await client.get('/api/source', {
            params: { path: conflict.source },
            responseType: 'arraybuffer',
        });
        if (response.status !== 200) return null;
        return Buffer.from(response.data).toString('utf-8');
    } catch {
        return null;
    }
}

export function formatConflictDiff(current, incoming, contextLines = 10) {
    const parts = diffLines(current ?? '', incoming ?? '');
    const lines = [];
    const pushLines = (color, prefix, partLines) => {
        partLines.forEach((line) => lines.push(color(prefix + line)));
    };
    const pushEllipsis = (omitted) => {
        lines.push(chalk.dim(`  ... ${omitted} unchanged line${omitted === 1 ? '' : 's'} ...`));
    };

    parts.forEach((part, index) => {
        const color = part.added ? chalk.green : part.removed ? chalk.red : chalk.dim;
        const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
        let partLines = part.value.split('\n');
        if (partLines[partLines.length - 1] === '') partLines.pop();

        if (part.added || part.removed) {
            pushLines(color, prefix, partLines);
            return;
        }

        // Unchanged context: keep at most `contextLines` lines adjoining each
        // neighboring change instead of dumping the whole (possibly huge) block.
        const isFirst = index === 0;
        const isLast = index === parts.length - 1;
        if (isFirst && isLast) {
            pushLines(color, prefix, partLines); // no changes at all
        } else if (isFirst) {
            if (partLines.length > contextLines) {
                pushEllipsis(partLines.length - contextLines);
                partLines = partLines.slice(-contextLines);
            }
            pushLines(color, prefix, partLines);
        } else if (isLast) {
            if (partLines.length > contextLines) {
                pushLines(color, prefix, partLines.slice(0, contextLines));
                pushEllipsis(partLines.length - contextLines);
                return;
            }
            pushLines(color, prefix, partLines);
        } else if (partLines.length > contextLines * 2) {
            pushLines(color, prefix, partLines.slice(0, contextLines));
            pushEllipsis(partLines.length - contextLines * 2);
            pushLines(color, prefix, partLines.slice(-contextLines));
        } else {
            pushLines(color, prefix, partLines);
        }
    });
    return lines.join('\n');
}

export const conflictCheckbox = createPrompt((config, done) => {
    const { pageSize = 7, loop = true, conflicts, client } = config;
    const shortcuts = { all: 'a', invert: 'i', diff: 'v', ...config.shortcuts };
    const theme = makeTheme(conflictCheckboxTheme, config.theme);
    const { keybindings } = theme;

    const conflictsByPath = useMemo(() => new Map(conflicts.map((c) => [c.path, c])), [conflicts]);

    const [status, setStatus] = useState('idle');
    const prefix = usePrefix({ status, theme });
    const [items, setItems] = useState(normalizeChoices(config.choices));
    const bounds = useMemo(() => {
        const first = items.findIndex(isNavigable);
        const last = items.findLastIndex(isNavigable);
        if (first === -1) {
            throw new ValidationError('[conflictCheckbox] No selectable choices.');
        }
        return { first, last };
    }, [items]);
    const [active, setActive] = useState(bounds.first);
    const [errorMsg, setError] = useState();
    const [diffFor, setDiffFor] = useState();
    const [diffText, setDiffText] = useState();
    const [loadingDiff, setLoadingDiff] = useState(false);

    useKeypress(async (key) => {
        if (diffFor !== undefined) {
            // While a diff is open, it takes over the prompt: every other key is
            // ignored and only Escape or 'v' again returns to the conflict list.
            // (Escape works, but a real terminal needs a brief pause to tell a lone
            // Escape apart from the start of another escape sequence; 'v' closes
            // instantly.)
            if (isEscapeKey(key) || key.name === shortcuts.diff) {
                setDiffFor(undefined);
                setDiffText(undefined);
            }
            return;
        }
        if (isEnterKey(key)) {
            const selection = items.filter(isChecked);
            setStatus('done');
            done(selection.map((choice) => choice.value));
        } else if (isUpKey(key, keybindings) || isDownKey(key, keybindings)) {
            if (errorMsg) setError(undefined);
            if (
                loop ||
                (isUpKey(key, keybindings) && active !== bounds.first) ||
                (isDownKey(key, keybindings) && active !== bounds.last)
            ) {
                const offset = isUpKey(key, keybindings) ? -1 : 1;
                let next = active;
                do {
                    next = (next + offset + items.length) % items.length;
                } while (!isNavigable(items[next]));
                setActive(next);
            }
        } else if (isSpaceKey(key)) {
            const activeItem = items[active];
            if (activeItem && !Separator.isSeparator(activeItem)) {
                setError(undefined);
                setItems(items.map((choice, i) => (i === active ? toggle(choice) : choice)));
            }
        } else if (key.name === shortcuts.all) {
            const selectAll = items.some((choice) => isSelectable(choice) && !choice.checked);
            setItems(items.map(check(selectAll)));
        } else if (key.name === shortcuts.invert) {
            setItems(items.map(toggle));
        } else if (key.name === shortcuts.diff) {
            const activeItem = items[active];
            if (!activeItem || Separator.isSeparator(activeItem)) return;
            const conflict = conflictsByPath.get(activeItem.value);
            if (!conflict || conflict.incoming == null) {
                setError('No diff available for this file (binary or unsupported type).');
                return;
            }
            setError(undefined);
            setDiffFor(activeItem.value);
            setDiffText(undefined);
            setLoadingDiff(true);
            const current = await fetchCurrentContent(client, conflict);
            setDiffText(formatConflictDiff(current, conflict.incoming));
            setLoadingDiff(false);
        }
    });

    const message = theme.style.message(config.message, status);
    const page = usePagination({
        items,
        active,
        renderItem({ item, isActive }) {
            if (Separator.isSeparator(item)) {
                return ` ${item.separator}`;
            }
            const cursor = isActive ? theme.icon.cursor : ' ';
            const checkbox = item.checked ? chalk.green('◉') : '◯';
            const color = isActive ? theme.style.highlight : (x) => x;
            return color(`${cursor}${checkbox} ${item.name}`);
        },
        pageSize,
        loop,
    });

    if (status === 'done') {
        const selection = items.filter(isChecked);
        const answer = theme.style.answer(selection.map((choice) => choice.short).join(', '));
        return [prefix, message, answer].filter(Boolean).join(' ');
    }

    const activeItem = items[active];
    const activeConflict = activeItem && !Separator.isSeparator(activeItem) ? conflictsByPath.get(activeItem.value) : undefined;
    const viewingDiff = diffFor !== undefined;
    const diffPanel = viewingDiff ? (loadingDiff ? chalk.dim('Loading diff...') : diffText || '') : '';

    let keys;
    if (viewingDiff) {
        keys = [[`esc or ${shortcuts.diff}`, 'close diff']];
    } else {
        keys = [
            ['↑↓', 'navigate'],
            ['space', 'select'],
            [shortcuts.all, 'all'],
            [shortcuts.invert, 'invert'],
        ];
        if (activeConflict?.incoming != null) {
            keys.push([shortcuts.diff, 'view diff']);
        }
        keys.push(['⏎', 'submit']);
    }
    const helpLine = keys.map(([key, action]) => `${chalk.bold(key)} ${chalk.dim(action)}`).join(chalk.dim(' • '));

    const lines = [
        [prefix, message].filter(Boolean).join(' '),
        page,
        ' ',
        diffPanel,
        errorMsg ? theme.style.error(errorMsg) : '',
        helpLine,
    ]
        .filter(Boolean)
        .join('\n')
        .trimEnd();

    return lines;
});
