import { buildPath } from "../src/catalog/build-path.js";
import type { ActionDef } from "../src/catalog/endpoints.js";

const samples: Array<{ action: ActionDef; args: Record<string, unknown>; expect: string }> = [
  {
    action: {
      action: "lista",
      path: "skladista/lista",
      description: "t",
    },
    args: {},
    expect: "skladista/lista",
  },
  {
    action: {
      action: "statusi",
      path: "NaloziProdaje/statusi/{statusi}/{od_datuma?}/{do_datuma?}",
      description: "t",
      params: [
        { name: "statusi", description: "", list: true },
        { name: "od_datuma", description: "", required: false },
        { name: "do_datuma", description: "", required: false },
      ],
    },
    args: { statusi: "01,02", od_datuma: "2024-01-01", do_datuma: "2024-01-31" },
    expect: "NaloziProdaje/statusi/[01,02]/1.1.2024/31.1.2024",
  },
  {
    action: {
      action: "naziv",
      path: "artikli/naziv/{dio_naziva?}/{page?}",
      description: "t",
      params: [
        { name: "dio_naziva", description: "", required: false },
        { name: "page", description: "", required: false, list: true },
      ],
    },
    args: { page: "0,50" },
    expect: "artikli/naziv/[0,50]",
  },
  {
    action: {
      action: "naziv_all",
      path: "artikli/naziv/{dio_naziva?}/{page?}",
      description: "t",
      params: [
        { name: "dio_naziva", description: "", required: false },
        { name: "page", description: "", required: false, list: true },
      ],
    },
    args: {},
    expect: "artikli/naziv",
  },
  {
    action: {
      action: "skladiste",
      path: "StanjeZalihe/Skladiste/{skladista?}",
      description: "t",
      params: [{ name: "skladista", description: "", required: false, list: true }],
    },
    args: { skladista: "10,100" },
    expect: "StanjeZalihe/Skladiste/[10,100]",
  },
];

let failed = 0;
for (const s of samples) {
  const got = buildPath(s.action, s.args);
  if (got !== s.expect) {
    console.error(`FAIL: ${got} !== ${s.expect}`);
    failed++;
  } else {
    console.log(`OK: ${got}`);
  }
}
process.exit(failed ? 1 : 0);
