const MIN_NODES = 300;
const MAX_NODES = 600;
const MAX_GROUPS = 12;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;

const chooseDistinct = (array, count) => {
  const picks = new Set();
  while (picks.size < count && picks.size < array.length) {
    const item = array[randomInt(0, array.length - 1)];
    picks.add(item);
  }
  return [...picks];
};

const hashLink = (a, b) => (a < b ? `${a}__${b}` : `${b}__${a}`);

const createMockNodes = (count) => {
  const nodes = [];
  const groupCount = Math.min(MAX_GROUPS, Math.max(4, Math.floor(Math.sqrt(count))));
  for (let i = 0; i < count; i += 1) {
    nodes.push({
      id: `n${i}`,
      label: `Node ${i + 1}`,
      group: randomInt(0, groupCount - 1),
    });
  }
  return nodes;
};

const createMockLinks = (nodes) => {
  const links = [];
  const seen = new Set();

  const addLink = (sourceId, targetId, weight = 1) => {
    if (sourceId === targetId) return;
    const key = hashLink(sourceId, targetId);
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source: sourceId, target: targetId, weight });
  };

  for (let i = 1; i < nodes.length; i += 1) {
    const source = nodes[randomInt(0, i - 1)];
    addLink(source.id, nodes[i].id, randomFloat(0.5, 2.5));
  }

  const averageExtras = randomFloat(1.5, 3.5);
  const totalExtra = Math.floor(nodes.length * averageExtras);
  for (let i = 0; i < totalExtra; i += 1) {
    const [a, b] = chooseDistinct(nodes, 2);
    if (!a || !b) continue;
    addLink(a.id, b.id, randomFloat(0.5, 3));
  }

  return links;
};

const normalizeGraph = (graph) => {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
    throw new Error('Graph JSON must include "nodes" and "links" arrays.');
  }

  const idSet = new Set();
  const nodes = graph.nodes.map((raw, index) => {
    const node = typeof raw === 'object' && raw !== null ? { ...raw } : { id: String(raw) };
    if (!node.id) node.id = `node-${index}`;
    node.id = String(node.id);
    if (idSet.has(node.id)) {
      let suffix = 1;
      let candidate = `${node.id}-${suffix}`;
      while (idSet.has(candidate)) {
        suffix += 1;
        candidate = `${node.id}-${suffix}`;
      }
      node.id = candidate;
    }
    idSet.add(node.id);
    node.label = node.label ? String(node.label) : node.id;
    if (typeof node.group !== 'number') {
      node.group = Number.parseInt(node.group ?? 0, 10) || 0;
    }
    return node;
  });

  const validIds = new Set(nodes.map((n) => n.id));
  const links = [];
  const seen = new Set();
  for (const rawLink of graph.links) {
    if (!rawLink) continue;
    const source = typeof rawLink.source === 'object' ? rawLink.source.id : rawLink.source;
    const target = typeof rawLink.target === 'object' ? rawLink.target.id : rawLink.target;
    if (!validIds.has(String(source)) || !validIds.has(String(target))) continue;
    const s = String(source);
    const t = String(target);
    if (s === t) continue;
    const key = hashLink(s, t);
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      source: s,
      target: t,
      weight: typeof rawLink.weight === 'number' ? rawLink.weight : 1,
    });
  }

  return { nodes, links };
};

const generateMockGraph = (count = randomInt(MIN_NODES, MAX_NODES)) => {
  const cappedCount = Math.max(MIN_NODES, Math.min(MAX_NODES, count));
  const nodes = createMockNodes(cappedCount);
  const links = createMockLinks(nodes);
  return { nodes, links };
};

const readFileAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the selected file.'));
  reader.readAsText(file);
});

const loadGraphFromFile = async (file) => {
  if (!(file instanceof File)) {
    throw new Error('Expected a File object.');
  }
  const text = await readFileAsText(file);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error('The provided file is not valid JSON.');
  }
  return normalizeGraph(parsed);
};

const mockGraph = generateMockGraph();

export { generateMockGraph, loadGraphFromFile, mockGraph, normalizeGraph };
