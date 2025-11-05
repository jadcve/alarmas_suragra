// src/db/stream.js
export async function* streamProc(pool, procName, { inputs = [], outputs = [] } = {}) {
  const req = pool.request();
  req.stream = true;

  for (const [name, type, value] of inputs) req.input(name, type, value);
  for (const [name, type] of outputs) req.output(name, type);

  const bag = [];
  const iter = new Promise((resolve, reject) => {
    req.on('row', row => bag.push(row));
    req.on('error', reject);
    req.on('done', resolve);
  });

  req.execute(procName);
  await iter;

  for (const row of bag) yield row;
}
