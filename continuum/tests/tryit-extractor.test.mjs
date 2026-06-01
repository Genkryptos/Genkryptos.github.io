import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadExtractor() {
  let source;
  try {
    source = await readFile(new URL('../src/tryit-extractor.js', import.meta.url), 'utf8');
  } catch (error) {
    assert.fail(`expected src/tryit-extractor.js to define the TryIt extractor API: ${error.message}`);
  }

  const sandbox = {
    console,
    window: {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'src/tryit-extractor.js' });
  assert.ok(sandbox.window.ContinuumTryIt, 'expected window.ContinuumTryIt API');
  return sandbox.window.ContinuumTryIt;
}

const extractor = await loadExtractor();

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

{
  const facts = await extractor.extractFacts(
    'I live in NYC and just adopted a dog named Rex.',
    null,
  );

  assert.deepEqual(
    plain(facts.map(({ subject, attribute, value }) => ({ subject, attribute, value }))),
    [
      { subject: 'user', attribute: 'location', value: 'NYC' },
      { subject: 'user', attribute: 'pets.dog', value: 'Rex' },
    ],
  );
}

{
  const facts = await extractor.extractFacts(
    'Actually I never made it to Boston - moved to Cambridge instead.',
    undefined,
  );

  assert.deepEqual(
    plain(facts.map(({ subject, attribute, value }) => ({ subject, attribute, value }))),
    [{ subject: 'user', attribute: 'location', value: 'Cambridge' }],
  );
}

{
  const facts = await extractor.extractFacts(
    'I just moved to Boston for a new job at Stripe.',
    {},
  );

  assert.deepEqual(
    plain(facts.map(({ subject, attribute, value }) => ({ subject, attribute, value }))),
    [
      { subject: 'user', attribute: 'location', value: 'Boston' },
      { subject: 'user', attribute: 'employer', value: 'Stripe' },
    ],
  );
}

{
  const facts = await extractor.extractFacts(
    'I sold my old Tesla and bought a Rivian last weekend.',
    {},
  );

  assert.deepEqual(
    plain(facts.map(({ subject, attribute, value }) => ({ subject, attribute, value }))),
    [{ subject: 'user', attribute: 'vehicle.owned', value: 'Rivian' }],
  );
}

{
  const facts = await extractor.extractFacts('My favorite food is dosa.', {});

  assert.deepEqual(
    plain(facts.map(({ subject, attribute, value }) => ({ subject, attribute, value }))),
    [{ subject: 'user', attribute: 'preferences.favorite_food', value: 'dosa' }],
  );
}

{
  const facts = await extractor.extractFacts('I love hiking on weekends.', {});

  assert.deepEqual(
    plain(facts.map(({ subject, attribute, value }) => ({ subject, attribute, value }))),
    [{ subject: 'user', attribute: 'preferences.likes', value: 'hiking on weekends' }],
  );
}

{
  const facts = await extractor.extractFacts('I have a blue backpack.', {});

  assert.deepEqual(
    plain(facts.map(({ subject, attribute, value }) => ({ subject, attribute, value }))),
    [{ subject: 'user', attribute: 'possessions.owned', value: 'blue backpack' }],
  );
}

{
  const facts = await extractor.extractFacts('I usually read science fiction before bed.', {});

  assert.deepEqual(
    plain(facts.map(({ subject, attribute, value }) => ({ subject, attribute, value }))),
    [{ subject: 'user', attribute: 'profile.note', value: 'I usually read science fiction before bed' }],
  );
}

{
  const facts = await extractor.extractFacts('ignored input', {
    complete: async () => '```json\n[{"subject":"user","attribute":"location","value":"Lisbon","confidence":0.93}]\n```',
  });

  assert.deepEqual(plain(facts), [
    { subject: 'user', attribute: 'location', value: 'Lisbon', confidence: 0.93 },
  ]);
}

{
  const html = await readFile(new URL('../Continuum Pipeline.html', import.meta.url), 'utf8');
  const extractorScript = html.search(/src="src\/tryit-extractor\.js\?v=local-\d+"/);
  const tryItScript = html.search(/src="src\/tryit\.jsx\?v=local-\d+"/);

  assert.notEqual(extractorScript, -1, 'expected HTML to load a versioned src/tryit-extractor.js');
  assert.notEqual(tryItScript, -1, 'expected HTML to load a versioned src/tryit.jsx');
  assert.ok(extractorScript < tryItScript, 'expected extractor script to load before tryit.jsx');
}

{
  const tryItSource = await readFile(new URL('../src/tryit.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(
    tryItSource,
    /extractFacts\(txt,\s*null\)/,
    'process turn should force the local extractor instead of window.claude',
  );
  assert.doesNotMatch(
    tryItSource,
    /window\.claude/,
    'process turn should not dereference window.claude directly',
  );
  assert.doesNotMatch(
    tryItSource,
    /<textarea\b/,
    'TryIt should not render a free-text textarea',
  );
  assert.doesNotMatch(
    tryItSource,
    /inputRef/,
    'TryIt should not depend on live textarea refs',
  );
  assert.match(
    tryItSource,
    /selectedPrompt\.trim\(\)/,
    'process turn should read the selected prompt',
  );
  assert.match(
    tryItSource,
    /tryit-choice-mark/,
    'selected option should render a dedicated visible check mark element',
  );
  assert.match(
    styles,
    /\.tryit-choice-mark\s*{[\s\S]*color:\s*var\(--accent\)/,
    'selected check mark should use the green accent color',
  );
  assert.match(
    styles,
    /\.tryit-choice-mark\s*{[\s\S]*font-weight:\s*700/,
    'selected check mark should be heavy enough to read clearly',
  );
}

{
  const ids = ['a001', 'b002', 'c003', 'd004', 'e005'];
  let facts = [];

  for (const statement of [
    'I live in NYC and just adopted a dog named Rex.',
    'I just moved to Boston for a new job at Stripe.',
    'Actually I never made it to Boston - moved to Cambridge instead.',
  ]) {
    const extracted = await extractor.extractFacts(statement, {});
    let updated = [...facts];

    for (const fact of extracted) {
      const newRow = {
        ...fact,
        id: ids.shift(),
        invalidated_at: null,
        replaced_by: null,
      };
      const existing = updated.find(
        (row) =>
          row.subject === newRow.subject &&
          row.attribute === newRow.attribute &&
          !row.invalidated_at &&
          row.value.toLowerCase() !== newRow.value.toLowerCase(),
      );
      if (existing) {
        updated = updated.map((row) =>
          row.id === existing.id
            ? { ...row, invalidated_at: '2026-06-01', replaced_by: newRow.id }
            : row,
        );
      }
      updated.push(newRow);
    }

    facts = updated;
  }

  const locations = facts.filter((fact) => fact.attribute === 'location');
  assert.deepEqual(
    plain(
      locations.map(({ value, invalidated_at, replaced_by }) => ({
        value,
        invalidated: invalidated_at !== null,
        replaced_by,
      })),
    ),
    [
      { value: 'NYC', invalidated: true, replaced_by: 'c003' },
      { value: 'Boston', invalidated: true, replaced_by: 'e005' },
      { value: 'Cambridge', invalidated: false, replaced_by: null },
    ],
  );
}
