export const categories = Object.freeze(['harvest', 'cash', 'attendance', 'weather']);

const visibleCategories = Object.freeze(['harvest', 'cash', 'weather']);
const stateSets = Object.freeze({
  harvest: ['good', 'weak', 'failed'],
  cash: ['enough', 'low', 'loan'],
  attendance: ['regular', 'irregular'],
  weather: ['sun', 'rain', 'storm'],
});

const contexts = Object.freeze([
  { id: 'C01', colorName: 'RED', light: '#a74638', dark: '#d06c58' },
  { id: 'C02', colorName: 'BLUE', light: '#316b8c', dark: '#6ca4c4' },
  { id: 'C03', colorName: 'AMBER', light: '#8b681d', dark: '#bd9c4e' },
  { id: 'C04', colorName: 'GREEN', light: '#39785c', dark: '#75ae8e' },
  { id: 'C05', colorName: 'PURPLE', light: '#72528e', dark: '#ad91c4' },
  { id: 'C06', colorName: 'PINK', light: '#a24b7d', dark: '#ce83ae' },
]);

const teamIds = ['A', 'B', 'C'];

export function cardKind(category, value, mode = 'hard') {
  if (mode === 'hard') return 'normal';
  if (mode === 'easy') return category === 'attendance' && value === 'dropout' ? 'danger' : 'normal';
  if ((category === 'harvest' && value === 'failed') || (category === 'cash' && value === 'loan')) return 'indicator';
  return 'normal';
}

function teachingFatal(values) {
  return values.harvest === 'failed' && values.cash === 'loan';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mix32(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function hashSeed(seed, ...parts) {
  let hash = mix32(Number.isFinite(seed) ? Math.trunc(seed) : 0);
  for (const part of parts) {
    const text = String(part);
    for (let i = 0; i < text.length; i++) {
      hash = mix32(hash ^ text.charCodeAt(i));
    }
    hash = mix32(hash ^ text.length);
  }
  return hash >>> 0;
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function roundKey(teamId, roundIndex, category, value, contextId) {
  return `${contextId}:${teamId}${roundIndex + 1}:${category}:${value}`;
}

function grade(value, thresholds, states) {
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) return states[i];
  }
  return states[thresholds.length];
}

function makeCue(teamId, roundIndex, category, value, contextId) {
  return {
    key: roundKey(teamId, roundIndex, category, value, contextId),
    context: contextId,
    value,
  };
}

// Archive and live rows call this exact sampler with independent random seeds.
function drawRow(rng, teamId, index, contextIndex, mode = 'hard') {
  const context = contexts[contextIndex];
  // Three previous-survey contexts, each with/without recent support.
  const pressure = [.10, -.16, .28, .02, .22, -.04][contextIndex];
  const latent = pressure + (mode === 'hard' ? 0 : .30) + (rng() - .5) * 1.5;
  const harvest = grade(latent + (rng() - .5) * .7, [.48, -.08], ['failed','weak','good']);
  const cash = grade(latent * .8 + (rng() - .5) * .85, [.40, -.15], ['loan','low','enough']);
  const w = rng();
  const weather = mode === 'hard'
    ? (w < .45 ? 'rain' : w < .80 ? 'sun' : 'storm')
    : (w < .35 ? 'storm' : w < .70 ? 'rain' : 'sun');
  // Synthetic association, not a claim of empirical dropout rates.
  const badHarvest=harvest==='failed', weakHarvest=harvest==='weak', loan=cash==='loan';
  const risk = clamp(.025 + (badHarvest?.10:weakHarvest?.06:0)
    + (loan?.10:cash==='low'?.04:0)
    + (loan&&badHarvest?.42:loan&&weakHarvest?.22:badHarvest&&cash==='low'?.20:0)
    + (weather==='storm'?.06:0) + pressure*.08, .02, .88);
  // Attendance is a survey observation, NOT the hidden outcome in disguise.
  // A child with regular attendance can experience a sudden dropout event.
  const attendance = rng() < .25 ? 'irregular' : 'regular';
  const sampledFatal = rng() < risk;
  const values = {harvest,cash,attendance,weather};
  const fatal = mode === 'hard' ? sampledFatal : teachingFatal(values);
  // Risks shows the outcome; Indicators keeps only the survey observations.
  if (mode === 'easy' && fatal) values.attendance = 'dropout';
  return {id:`${teamId}${index+1}`,teamId,roundIndex:index,contextId:context.id,
    initialCategory:pick(rng,visibleCategories),
    targetCues:Object.fromEntries(categories.map(c=>[c,makeCue(teamId,index,c,values[c],context.id)])),
    fatal};
}
function updateContext(previous,action='go') {
  const c=previous.targetCues;
  const survey=c.harvest.value==='failed'||(c.harvest.value==='weak'&&c.cash.value==='loan')?1
    :c.cash.value!=='enough'?2:0;
  return survey*2+(action==='avoid'?1:0);
}

// Same monthly random draws for counterfactual action paths. Only known context changes.
export function currentRound(pack,teamIndex,actions=[]) {
  const teamId=teamIds[teamIndex];
  let contextIndex=(pack.seed%6+6+teamIndex)%6,row;
  for(let i=0;i<=actions.length;i++){
    const rng=makeRng(hashSeed(pack.seed,'live',teamId,i));
    row=drawRow(rng,teamId,i,contextIndex,pack.mode);
    if(i<actions.length)contextIndex=updateContext(row,actions[i]);
  }
  return row;
}

function entropy(probability) {
  const p = clamp(probability, 1e-9, 1 - 1e-9);
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

function topologicalCounts(values, total) {
  const totalWeight = values.reduce((sum, value) => sum + value.weight, 0);
  if (totalWeight <= 0) {
    const even = Math.floor(total / values.length);
    let remainder = total - even * values.length;
    return values.map((entry) => {
      const count = even + (remainder > 0 ? 1 : 0);
      remainder -= remainder > 0 ? 1 : 0;
      return { ...entry, count };
    });
  }
  const allocated = values.map((entry) => {
    const exact = (entry.weight / totalWeight) * total;
    return {
      ...entry,
      count: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  let used = allocated.reduce((sum, entry) => sum + entry.count, 0);
  const sorted = [...allocated].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; used < total; i++, used++) {
    sorted[i % sorted.length].count++;
  }
  return values.map((entry) => {
    const match = sorted.find((candidate) => candidate.label === entry.label);
    return { ...entry, count: match ? match.count : 0 };
  });
}

function selectPool(pack, round, revealedSet) {
  const visible=[...revealedSet];
  const pool=pack.historiesByTeam[round.teamId].filter(sample=>sample.contextId===round.contextId
    && visible.every(c=>sample.targetCues[c].value===round.targetCues[c].value));
  if(pool.length)return pool;
  // Deterministic conditional simulation for a rare archive gap. No mismatched fallback.
  const rng=makeRng(hashSeed(pack.seed,'backfill',round.teamId,round.contextId,
    visible.sort().map(c=>c+':'+round.targetCues[c].value).join('|')));
  const ctx=contexts.findIndex(c=>c.id===round.contextId),extra=[];
  for(let n=0;n<100000&&extra.length<30;n++){
    const sample=drawRow(rng,round.teamId,n,ctx,pack.mode);
    if(visible.every(c=>sample.targetCues[c].value===round.targetCues[c].value))extra.push(sample);
  }
  if(!extra.length)throw Error('Unsupported evidence combination');
  return extra;
}

function posteriorFatal(pool, mode = 'hard') {
  const fatal = pool.filter((sample) => sample.fatal).length;
  return mode === 'hard' ? (fatal + 1) / (pool.length + 2) : fatal / pool.length;
}

function inspectionWeights(pool, round, revealedSet, mode = 'hard') {
  const total = pool.length || 1;
  const currentFatal = posteriorFatal(pool, mode);
  const currentEntropy = entropy(currentFatal);
  const choices = categories
    .filter((category) => !revealedSet.has(category))
    .map((category) => {
      const groups = new Map();
      for (const sample of pool) {
        const value = sample.targetCues[category].value;
        let group = groups.get(value);
        if (!group) {
          group = [];
          groups.set(value, group);
        }
        group.push(sample);
      }
      let conditionalEntropy = 0;
      for (const group of groups.values()) {
        const p = posteriorFatal(group, mode);
        conditionalEntropy += (group.length / total) * entropy(p);
      }
      const rawGain = currentEntropy - conditionalEntropy;
      const gain = rawGain > .005 ? rawGain : 0;
      return { label: category, weight: gain };
    });
  return choices;
}

export function createPack(seed = 15, count = 200, mode = 'hard') {
  if (!['easy', 'medium', 'hard'].includes(mode)) throw new Error(`Unsupported household mode: ${mode}`);
  const normalizedSeed = Number.isFinite(seed) ? Math.trunc(seed) : 15;
  const sheetCount = Number.isFinite(count) ? Math.max(1, Math.trunc(count)) : 200;
  const packId = mode === 'hard' ? `HH2-${normalizedSeed}-${sheetCount}` : `HH4-${mode}-${normalizedSeed}-${sheetCount}`;
  const historiesByTeam = {};
  const teams = teamIds.map((teamId, teamIndex) => {
    const rounds=Array.from({length:6},(_,i)=>currentRound({seed:normalizedSeed,mode},teamIndex,Array(i).fill('go')));
    const archiveRng=makeRng(hashSeed(normalizedSeed,'archive',teamId));
    historiesByTeam[teamId]=Array.from({length:3600},(_,i)=>drawRow(archiveRng,teamId,i,i%6,mode));
    return {id:teamId,rounds,audienceCount:Math.floor(sheetCount/teamIds.length)+(teamIndex<sheetCount%teamIds.length?1:0)};
  });
  return {
    version: mode === 'hard' ? 'HH2' : 'HH4',
    mode,
    packId,
    seed: normalizedSeed,
    sheetCount,
    roundCount: 6,
    revealTokens: 3,
    interventions: mode === 'hard' ? 2 : 6,
    contexts: contexts.map((context) => ({ ...context })),
    teams,
    historiesByTeam,
  };
}

export function poll(pack, round, revealed = [], tokens = 0) {
  const revealedSet = new Set(revealed);
  const pool = selectPool(pack, round, revealedSet);
  const total = pack.teams.find(t=>t.id===round.teamId).audienceCount;
  const mode = pack.mode ?? 'hard';
  const fatalRate = posteriorFatal(pool, mode);
  const actionWeights = [];

  if (tokens <= 0) {
    const avoidRatio = mode === 'hard' ? clamp(fatalRate, 0.02, 0.98) : fatalRate;
    actionWeights.push({ label: 'go', weight: 1 - avoidRatio });
    actionWeights.push({ label: 'avoid', weight: avoidRatio });
  } else {
    const certainty = 1 - 4 * fatalRate * (1 - fatalRate);
    const actionShare = clamp(0.28 + 0.6 * certainty, 0.28, 0.88);
    const goWeight = 1 - fatalRate;
    const avoidWeight = fatalRate;
    actionWeights.push({ label: 'go', weight: actionShare * goWeight });
    actionWeights.push({ label: 'avoid', weight: actionShare * avoidWeight });
  }

  const inspectionShare = tokens > 0 ? 1 - actionWeights.reduce((sum, entry) => sum + entry.weight, 0) : 0;
  const inspections = inspectionWeights(pool, round, revealedSet, mode);
  const inspectionTotal = inspections.reduce((sum, entry) => sum + entry.weight, 0);
  if(inspectionTotal===0){actionWeights[0].weight=1-fatalRate;actionWeights[1].weight=fatalRate;}
  const adjustedInspections = inspections.map((entry) => ({
    label: entry.label,
    weight: inspectionTotal > 0 ? entry.weight * (inspectionShare / inspectionTotal) : 0,
  }));

  const weighted = topologicalCounts([...actionWeights, ...adjustedInspections], total);
  const counts = {
    go: 0,
    avoid: 0,
    harvest: 0,
    cash: 0,
    attendance: 0,
    weather: 0,
  };
  for (const entry of weighted) {
    counts[entry.label] = entry.count;
  }
  return { counts, total, matched: pool.length };
}
