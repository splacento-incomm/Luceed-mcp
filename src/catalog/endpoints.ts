/**
 * Full read-only Luceed datasnap/rest catalog (Web Services 2.206 + Magento usage).
 * Path templates use {param}; optional segments use {param?}.
 * Arrays in URLs use bracket lists, e.g. [01,02] or [0,100].
 */

export type ParamDef = {
  name: string;
  description: string;
  required?: boolean;
  /** If true, comma-separated values become [a,b,c] */
  list?: boolean;
};

export type ActionDef = {
  /** Action key used in the tool `action` enum */
  action: string;
  /** Relative path template under /datasnap/rest/ */
  path: string;
  description: string;
  params?: ParamDef[];
  /** Used by Magento Debuglabs/Luceed integration */
  usedByMagento?: boolean;
};

export type ResourceDef = {
  /** Tool name suffix → luceed_{id} */
  id: string;
  title: string;
  description: string;
  actions: ActionDef[];
};

function p(
  name: string,
  description: string,
  opts: Partial<ParamDef> = {},
): ParamDef {
  return { name, description, required: true, ...opts };
}

function opt(
  name: string,
  description: string,
  opts: Partial<ParamDef> = {},
): ParamDef {
  return { name, description, required: false, ...opts };
}

export const CATALOG: ResourceDef[] = [
  // ── Products ────────────────────────────────────────────────────────────
  {
    id: "artikli",
    title: "Products (artikli)",
    description: "Product catalog: by code, barcode, UID, name, group, brand, attribute, list.",
    actions: [
      {
        action: "sifra",
        path: "artikli/sifra/{sifra}",
        description: "One product by article code",
        params: [p("sifra", "Article code")],
      },
      {
        action: "sifradio",
        path: "artikli/sifradio/{dio_sifre}",
        description: "Products by partial article code",
        params: [p("dio_sifre", "Partial article code")],
      },
      {
        action: "barcode",
        path: "artikli/barcode/{barcode}",
        description: "One product by barcode",
        params: [p("barcode", "Barcode")],
      },
      {
        action: "uid",
        path: "artikli/uid/{uid}",
        description: "One product by artikl_uid",
        params: [p("uid", "Article UID (id-sid)")],
      },
      {
        action: "naziv",
        path: "artikli/naziv/{dio_naziva?}/{page?}",
        description: "Products by name (partial). Empty name = all (Magento sync). Optional pagination [offset,limit]",
        params: [
          opt("dio_naziva", "Partial name (empty = all)"),
          opt("page", "Pagination e.g. 0,100 → [0,100]", { list: true }),
        ],
        usedByMagento: true,
      },
      {
        action: "lista",
        path: "artikli/lista/{page?}",
        description: "Product list without detail tables",
        params: [opt("page", "Pagination e.g. 0,100", { list: true })],
      },
      {
        action: "grupa",
        path: "artikli/GrupaArtikla/{sifra}",
        description: "Products by article group code",
        params: [p("sifra", "Article group code")],
      },
      {
        action: "grupa_naziv",
        path: "artikli/GrupaArtiklaNaziv/{dio_naziva}",
        description: "Products by article group name (partial)",
        params: [p("dio_naziva", "Partial group name")],
      },
      {
        action: "robna_marka",
        path: "artikli/RobnaMarka/{sifra}",
        description: "Products by brand code",
        params: [p("sifra", "Brand code")],
      },
      {
        action: "robna_marka_naziv",
        path: "artikli/RobnaMarkaNaziv/{dio_naziva}",
        description: "Products by brand name (partial)",
        params: [p("dio_naziva", "Partial brand name")],
      },
      {
        action: "atribut",
        path: "artikli/atribut/{tip}/{sifra_atributa}/{vrijednost}",
        description: "Products by attribute (tip: atribut|atribut_b2b|atribut_uid)",
        params: [
          p("tip", "atribut | atribut_b2b | atribut_uid"),
          p("sifra_atributa", "Attribute code/UID"),
          p("vrijednost", "Attribute value or partial"),
        ],
      },
      {
        action: "dokumenti",
        path: "artikli/dokumenti/{file_uid}",
        description: "Product documents by file UID",
        params: [p("file_uid", "Document file UID")],
      },
      {
        action: "dodaci",
        path: "artikli/dodaci/lista/{page?}",
        description: "Products with additional products",
        params: [opt("page", "Pagination e.g. 0,100", { list: true })],
      },
      {
        action: "prijevodi",
        path: "artikli/prijevodi/{jezik}/{page?}",
        description: "Products with translations for a language",
        params: [
          p("jezik", "Language code e.g. ENG"),
          opt("page", "Pagination e.g. 0,100", { list: true }),
        ],
      },
      {
        action: "sastavnice_sifra",
        path: "artikli/sastavnice/sifra/{sifra}",
        description: "Product components (BOM) by article code",
        params: [p("sifra", "Article code")],
      },
      {
        action: "sastavnice_uid",
        path: "artikli/sastavnice/uid/{uid}",
        description: "Product components (BOM) by article UID",
        params: [p("uid", "Article UID")],
      },
    ],
  },
  {
    id: "artikli_popusti",
    title: "Items on sale / discounts",
    description: "Articles currently on sale (artiklipopusti).",
    actions: [
      { action: "lista", path: "artiklipopusti/lista", description: "All items on sale" },
      {
        action: "sifra",
        path: "artiklipopusti/sifra/{sifra}",
        description: "Sale info for one article code",
        params: [p("sifra", "Article code")],
      },
    ],
  },
  {
    id: "bundle",
    title: "Bundle items",
    description: "Bundle article definitions and components.",
    actions: [
      { action: "lista", path: "bundleartikl/lista", description: "All bundles" },
      {
        action: "lista_uid",
        path: "bundleartikl/lista/uid/{uid}",
        description: "Bundle by article UID",
        params: [p("uid", "Article UID")],
      },
      {
        action: "lista_b2b",
        path: "bundleartikl/lista/b2b/{b2b}",
        description: "Bundle by B2B key",
        params: [p("b2b", "Article B2B key")],
      },
    ],
  },

  // ── Warehouses & stock ──────────────────────────────────────────────────
  {
    id: "skladista",
    title: "Warehouses",
    description: "Warehouse and business unit master data.",
    actions: [
      {
        action: "lista",
        path: "skladista/lista",
        description: "All warehouses",
        usedByMagento: true,
      },
      {
        action: "sifra",
        path: "skladista/sifra/{sifra}",
        description: "One warehouse by code",
        params: [p("sifra", "Warehouse code")],
      },
    ],
  },
  {
    id: "stanje_zalihe",
    title: "Stock status",
    description: "Stock and availability by warehouse / article / barcode / attribute.",
    actions: [
      {
        action: "skladiste",
        path: "StanjeZalihe/Skladiste/{skladista?}",
        description: "Stock for warehouse(s). Empty = all. Comma-separated → [a,b]",
        params: [opt("skladista", "Warehouse code(s)", { list: true })],
        usedByMagento: true,
      },
      {
        action: "skladiste_artikl",
        path: "StanjeZalihe/Skladiste/{skladista}/{sifra_artikla}",
        description: "Stock for warehouse(s) + one article",
        params: [
          p("skladista", "Warehouse code(s)", { list: true }),
          p("sifra_artikla", "Article code"),
        ],
      },
      {
        action: "vrsta_skladista",
        path: "StanjeZalihe/VrstaSkladista/{vrste}",
        description: "Stock by warehouse type(s) e.g. VP,TR",
        params: [p("vrste", "Warehouse type code(s)", { list: true })],
      },
      {
        action: "vrsta_skladista_artikl",
        path: "StanjeZalihe/VrstaSkladista/{vrste}/{sifra_artikla}",
        description: "Stock by warehouse type(s) + article",
        params: [
          p("vrste", "Warehouse type code(s)", { list: true }),
          p("sifra_artikla", "Article code"),
        ],
      },
      {
        action: "artikl",
        path: "StanjeZalihe/Artikl/{sifra_artikla}/{skladista?}",
        description: "Stock for article across warehouses",
        params: [
          p("sifra_artikla", "Article code"),
          opt("skladista", "Optional warehouse filter", { list: true }),
        ],
      },
      {
        action: "barcode",
        path: "StanjeZalihe/Barcode/{barcode}/{skladista?}",
        description: "Stock by barcode",
        params: [
          p("barcode", "Barcode"),
          opt("skladista", "Optional warehouse filter", { list: true }),
        ],
      },
      {
        action: "artikl_uid",
        path: "StanjeZalihe/ArtiklUID/{uid}/{skladista?}",
        description: "Stock by article UID",
        params: [
          p("uid", "Article UID"),
          opt("skladista", "Optional warehouse filter", { list: true }),
        ],
      },
      {
        action: "atribut",
        path: "StanjeZalihe/Atribut/{tip}/{sifra_atributa}/{vrijednost}/{skladista?}",
        description: "Stock for products matching attribute",
        params: [
          p("tip", "atribut | atribut_b2b | atribut_uid"),
          p("sifra_atributa", "Attribute code"),
          p("vrijednost", "Attribute value"),
          opt("skladista", "Optional warehouse filter", { list: true }),
        ],
      },
    ],
  },
  {
    id: "stanje_zalihe_dobavljaci",
    title: "Supplier stock",
    description: "Supplier stock levels (StanjeZaliheDobavljaci).",
    actions: [
      { action: "lista", path: "StanjeZaliheDobavljaci/Lista", description: "All supplier stock" },
      {
        action: "artikl",
        path: "StanjeZaliheDobavljaci/Artikl/{sifra}",
        description: "Supplier stock for article",
        params: [p("sifra", "Article code")],
      },
      {
        action: "dobavljac",
        path: "StanjeZaliheDobavljaci/Dobavljac/{sifra}",
        description: "Stock for one supplier",
        params: [p("sifra", "Supplier code")],
      },
      {
        action: "artikl_dobavljac",
        path: "StanjeZaliheDobavljaci/ArtiklDobavljac/{sifra_artikla}/{sifra_dobavljaca}",
        description: "Stock for article + supplier",
        params: [
          p("sifra_artikla", "Article code"),
          p("sifra_dobavljaca", "Supplier code"),
        ],
      },
    ],
  },
  {
    id: "stanje_zalihe_serijski",
    title: "Serial-number stock",
    description: "Stock status by serial number.",
    actions: [
      {
        action: "artikl",
        path: "StanjeZaliheSerijski/artikl/{sifra}",
        description: "Serial stock for article",
        params: [p("sifra", "Article code")],
      },
      {
        action: "serijski",
        path: "StanjeZaliheSerijski/serijski/{serijski}",
        description: "Status for one serial number",
        params: [p("serijski", "Serial number")],
      },
    ],
  },

  // ── Prices ──────────────────────────────────────────────────────────────
  {
    id: "cijene",
    title: "Current prices",
    description: "Current selling price including promotions.",
    actions: [
      {
        action: "sifra",
        path: "cijene/sifra/{sifra}",
        description: "Price by article code",
        params: [p("sifra", "Article code")],
      },
      {
        action: "barcode",
        path: "cijene/barcode/{barcode}",
        description: "Price by barcode",
        params: [p("barcode", "Barcode")],
      },
      {
        action: "partner",
        path: "cijene/partner/{sifra}/{tip_partner}/{partner}/{valuta}",
        description: "Partner-specific price",
        params: [
          p("sifra", "Article code"),
          p("tip_partner", "partner | partner_uid | partner_b2b"),
          p("partner", "Partner identifier"),
          p("valuta", "Currency code e.g. EUR"),
        ],
      },
      {
        action: "loyalty",
        path: "cijene/loyaltyusername/{sifra}/{username}",
        description: "Loyalty price for username",
        params: [
          p("sifra", "Article code"),
          p("username", "Loyalty username"),
        ],
      },
    ],
  },
  {
    id: "cjenik",
    title: "Price list",
    description: "Service partner price list.",
    actions: [
      { action: "lista", path: "cjenik/lista", description: "Full price list" },
    ],
  },
  {
    id: "cjenik_partner",
    title: "Partner price list",
    description: "Partner-specific price lists and diffs.",
    actions: [
      {
        action: "sifra",
        path: "cjenikpartner/sifra/{sifra}",
        description: "Partner price list by partner code",
        params: [p("sifra", "Partner code")],
      },
      {
        action: "uid",
        path: "cjenikpartner/uid/{uid}",
        description: "Partner price list by partner UID",
        params: [p("uid", "Partner UID")],
      },
      {
        action: "getdiff",
        path: "cjenikpartner/getdiff/{modified}/{tip}/{partner}/{page?}",
        description: "Price list changes since modified timestamp",
        params: [
          p("modified", "Modified timestamp"),
          p("tip", "Lookup type"),
          p("partner", "Partner identifier"),
          opt("page", "Optional pagination", { list: true }),
        ],
      },
    ],
  },
  {
    id: "akcije",
    title: "Sales campaigns 1.0",
    description: "Promotional campaigns (akcije).",
    actions: [
      {
        action: "lista",
        path: "akcije/lista",
        description: "List campaigns",
        usedByMagento: true,
      },
    ],
  },
  {
    id: "prodajne_akcije",
    title: "Sales campaigns 2.0",
    description: "Sales campaigns v2 (prodajneakcije).",
    actions: [
      { action: "lista", path: "prodajneakcije/lista", description: "List campaigns 2.0" },
    ],
  },
  {
    id: "prodajni_uvjeti",
    title: "Sales conditions",
    description: "Sales conditions for partners.",
    actions: [
      {
        action: "partneri",
        path: "ProdajniUvjeti/partneri/{partneri}",
        description: "Conditions for partner code(s)",
        params: [p("partneri", "Partner code(s)", { list: true })],
      },
    ],
  },

  // ── Partners & users ────────────────────────────────────────────────────
  {
    id: "partneri",
    title: "Partners / customers",
    description: "Partner master data lookup.",
    actions: [
      {
        action: "sifra",
        path: "partneri/sifra/{sifra}",
        description: "By partner code",
        params: [p("sifra", "Partner code")],
      },
      {
        action: "oib",
        path: "partneri/oib/{oib}",
        description: "By OIB (may auto-create via Company Info if configured)",
        params: [p("oib", "OIB")],
      },
      {
        action: "naziv",
        path: "partneri/naziv/{dio_naziva}/{page?}",
        description: "By name (partial)",
        params: [
          p("dio_naziva", "Partial name"),
          opt("page", "Pagination", { list: true }),
        ],
      },
      {
        action: "prezime",
        path: "partneri/prezime/{dio_prezimena}/{page?}",
        description: "By surname (partial)",
        params: [
          p("dio_prezimena", "Partial surname"),
          opt("page", "Pagination", { list: true }),
        ],
      },
      {
        action: "email",
        path: "partneri/email/{email}",
        description: "By email",
        params: [p("email", "Email")],
        usedByMagento: true,
      },
      {
        action: "uid",
        path: "partneri/uid/{uid}",
        description: "By partner UID",
        params: [p("uid", "Partner UID")],
      },
      {
        action: "gln",
        path: "partneri/gln/{gln}",
        description: "By GLN",
        params: [p("gln", "GLN number")],
      },
      {
        action: "grupa",
        path: "partneri/GrupaPartnera/{grupa}/{page?}",
        description: "By partner group",
        params: [
          p("grupa", "Partner group code"),
          opt("page", "Pagination", { list: true }),
        ],
      },
      {
        action: "nivo",
        path: "partneri/NivoPartnera/{nivo}/{page?}",
        description: "By partner level",
        params: [
          p("nivo", "Partner level code"),
          opt("page", "Pagination", { list: true }),
        ],
      },
      {
        action: "korisnici",
        path: "partneri/korisnici/{partner_uid}/{page?}",
        description: "Users linked to partner",
        params: [
          p("partner_uid", "Partner UID"),
          opt("page", "Pagination", { list: true }),
        ],
      },
    ],
  },
  {
    id: "users",
    title: "Users",
    description: "Loyalty / web users (read).",
    actions: [
      {
        action: "listatip",
        path: "users/listatip/{tip}/{dio_prezimena}",
        description: "List by user type + surname fragment",
        params: [
          p("tip", "User type code"),
          p("dio_prezimena", "Partial surname"),
        ],
      },
      {
        action: "listaprezime",
        path: "users/listaprezime/{dio_prezimena}",
        description: "List by surname",
        params: [p("dio_prezimena", "Partial surname")],
      },
      {
        action: "listaime",
        path: "users/listaime/{dio_imena}",
        description: "List by first name",
        params: [p("dio_imena", "Partial first name")],
      },
      {
        action: "uid",
        path: "users/uid/{uid}",
        description: "User details by UID",
        params: [p("uid", "User UID")],
      },
      {
        action: "username",
        path: "users/username/{username}",
        description: "User details by username",
        params: [p("username", "Username")],
      },
    ],
  },

  // ── Master data ─────────────────────────────────────────────────────────
  {
    id: "mjesta",
    title: "Locations / cities",
    description: "Places (mjesta) — Magento uses mjesta/list for full list.",
    actions: [
      {
        action: "list",
        path: "mjesta/list",
        description: "Full places list (used by Magento)",
        usedByMagento: true,
      },
      {
        action: "sifra",
        path: "mjesta/sifra/{sifra}",
        description: "By place code",
        params: [p("sifra", "Place code")],
      },
      {
        action: "naziv",
        path: "mjesta/naziv/{dio_naziva}",
        description: "By place name (partial)",
        params: [p("dio_naziva", "Partial place name")],
      },
      {
        action: "postanskibroj",
        path: "mjesta/postanskibroj/{postanski_broj}/{dio_naziva?}",
        description: "By postal code (+ optional name fragment)",
        params: [
          p("postanski_broj", "Postal code"),
          opt("dio_naziva", "Optional place name fragment"),
        ],
        usedByMagento: true,
      },
    ],
  },
  {
    id: "vrste_placanja",
    title: "Payment types",
    description: "Payment type master data.",
    actions: [
      { action: "list", path: "vrsteplacanja/list", description: "All payment types" },
    ],
  },
  {
    id: "grupe_artikala",
    title: "Product groups",
    description: "Article groups.",
    actions: [
      { action: "lista", path: "grupeartikala/lista", description: "All groups" },
      {
        action: "sifra",
        path: "grupeartikala/sifra/{sifra}",
        description: "By group code",
        params: [p("sifra", "Group code")],
      },
      {
        action: "naziv",
        path: "grupeartikala/naziv/{dio_naziva}",
        description: "By group name",
        params: [p("dio_naziva", "Partial name")],
      },
      {
        action: "dodaci",
        path: "grupepartikala/dodaci/lista",
        description: "Groups with additional products config",
      },
    ],
  },
  {
    id: "robne_marke",
    title: "Brands",
    description: "Brand / robne marke list.",
    actions: [
      { action: "lista", path: "robnemarke/lista", description: "All brands" },
    ],
  },
  {
    id: "sifrarnici",
    title: "Code lists",
    description: "Generic Luceed code lists (countries, etc.). Magento uses drzava.",
    actions: [
      { action: "list", path: "sifrarnici/list", description: "Available code-list names" },
      {
        action: "list_one",
        path: "sifrarnici/list/{sifrarnik}",
        description: "Entries for one code list",
        params: [p("sifrarnik", "Code list name e.g. drzava")],
      },
      {
        action: "fulllist",
        path: "sifrarnici/fulllist/{sifrarnik}",
        description: "Full list for one code list",
        params: [p("sifrarnik", "Code list name")],
      },
      {
        action: "info",
        path: "sifrarnici/info/{sifrarnik}",
        description: "Metadata for a code list",
        params: [p("sifrarnik", "Code list name")],
      },
      {
        action: "naziv",
        path: "sifrarnici/naziv/{sifrarnik}/{value?}",
        description: "Lookup by name (Magento: sifrarnici/naziv/drzava/HR)",
        params: [
          p("sifrarnik", "Code list name"),
          opt("value", "Optional name/value filter"),
        ],
        usedByMagento: true,
      },
      {
        action: "sifra",
        path: "sifrarnici/sifra/{sifrarnik}/{value}",
        description: "Lookup by code",
        params: [
          p("sifrarnik", "Code list name"),
          p("value", "Code value"),
        ],
      },
      {
        action: "uid",
        path: "sifrarnici/uid/{sifrarnik}/{value}",
        description: "Lookup by UID",
        params: [
          p("sifrarnik", "Code list name"),
          p("value", "UID value"),
        ],
      },
    ],
  },
  {
    id: "statusi",
    title: "Statuses",
    description: "Status definitions by domain.",
    actions: [
      { action: "lista", path: "Statusi/Lista", description: "All status domains / list" },
      {
        action: "domena",
        path: "Statusi/Lista/{domena}",
        description: "Statuses for a domain e.g. posiljke",
        params: [p("domena", "Domain code")],
      },
      {
        action: "nalozi_prodaje",
        path: "NaloziProdaje/Statusi",
        description: "Sales-order status definitions",
      },
    ],
  },
  {
    id: "prijevodi",
    title: "Translations",
    description: "Translation records for tables.",
    actions: [
      {
        action: "lista",
        path: "prijevodi/lista/{tablica}/{jezik?}/{uid?}",
        description: "Translations for table (+ optional language/UID)",
        params: [
          p("tablica", "Table name e.g. artikli"),
          opt("jezik", "Language code"),
          opt("uid", "Record UID"),
        ],
      },
    ],
  },
  {
    id: "varijante",
    title: "Variants",
    description: "Product variants.",
    actions: [
      { action: "lista", path: "varijante/lista", description: "All variants" },
    ],
  },
  {
    id: "bodovi",
    title: "Scoring / points",
    description: "Loyalty scoring system data.",
    actions: [
      {
        action: "lista",
        path: "bodovi/lista/{od_datuma?}",
        description: "Points list (optional from-date)",
        params: [opt("od_datuma", "From date D.M.YYYY or YYYY-MM-DD")],
      },
    ],
  },
  {
    id: "tecajna_lista",
    title: "Exchange rates",
    description: "Currency exchange rate list.",
    actions: [
      { action: "lista", path: "tecajnalista/lista", description: "Latest exchange rates" },
    ],
  },
  {
    id: "crm_razlozi",
    title: "CRM visit causes",
    description: "CRM visit reason codes.",
    actions: [
      { action: "lista", path: "crmrazloziobilazaka/lista", description: "All visit causes" },
    ],
  },
  {
    id: "predmeti",
    title: "Cases (predmeti)",
    description: "CRM / case records.",
    actions: [
      { action: "lista", path: "predmeti/lista", description: "List cases" },
      {
        action: "sifra",
        path: "predmeti/sifra/{sifra}",
        description: "Case by code",
        params: [p("sifra", "Case code")],
      },
      {
        action: "uid",
        path: "predmeti/uid/{uid}",
        description: "Case by UID",
        params: [p("uid", "Case UID")],
      },
    ],
  },

  // ── Retail sales (core analytics) ───────────────────────────────────────
  {
    id: "mpracuni",
    title: "Retail invoices",
    description: "Maloprodajni računi — list and fetch retail invoices.",
    actions: [
      {
        action: "lista",
        path: "mpracuni/lista/{pj_uid}/{od_datuma}/{do_datuma}",
        description: "List retail invoices for PJ + date range",
        params: [
          p("pj_uid", "Business unit UID"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "uid",
        path: "mpracuni/uid/{uid}",
        description: "One retail invoice by UID",
        params: [p("uid", "mprac_uid")],
      },
      {
        action: "broj",
        path: "mpracuni/broj/{pj_uid}/{broj}/{godina}",
        description: "Invoice by number/year",
        params: [
          p("pj_uid", "Business unit UID"),
          p("broj", "Invoice number"),
          p("godina", "Year"),
        ],
      },
      {
        action: "nalogprodaje",
        path: "mpracuni/nalogprodaje/{uid}",
        description: "Retail invoice linked to sales order UID",
        params: [p("uid", "Sales order UID")],
      },
      {
        action: "barcode",
        path: "mpracuni/LuceedBarcode/{barcode}",
        description: "By Luceed document barcode",
        params: [p("barcode", "Document barcode")],
      },
      {
        action: "pdf",
        path: "mpracuni/pdf/{uid}",
        description: "Retail invoice PDF (base64)",
        params: [p("uid", "mprac_uid")],
      },
    ],
  },
  {
    id: "mpobracun",
    title: "Retail sales calculations",
    description: "Retail turnover by payment type or by product — use for 'how much sales'.",
    actions: [
      {
        action: "placanja",
        path: "mpobracun/placanja/{pj_uid}/{od_datuma}/{do_datuma?}",
        description: "Totals by payment type",
        params: [
          p("pj_uid", "Business unit UID"),
          p("od_datuma", "From date"),
          opt("do_datuma", "To date"),
        ],
      },
      {
        action: "artikli",
        path: "mpobracun/artikli/{pj_uid}/{od_datuma}/{do_datuma?}",
        description: "Totals by product",
        params: [
          p("pj_uid", "Business unit UID"),
          p("od_datuma", "From date"),
          opt("do_datuma", "To date"),
        ],
      },
    ],
  },

  // ── Sales orders ────────────────────────────────────────────────────────
  {
    id: "nalozi_prodaje",
    title: "Sales orders (nalozi prodaje)",
    description: "B2B / wholesale sales orders — heavily used by Magento sync.",
    actions: [
      {
        action: "statusi",
        path: "NaloziProdaje/statusi/{statusi}/{od_datuma?}/{do_datuma?}",
        description: "List by status code(s) + optional dates",
        params: [
          p("statusi", "Status codes comma-separated", { list: true }),
          opt("od_datuma", "From date"),
          opt("do_datuma", "To date"),
        ],
        usedByMagento: true,
      },
      {
        action: "partner",
        path: "NaloziProdaje/partner/{partner}/{od_datuma}/{do_datuma}",
        description: "List by partner + date range",
        params: [
          p("partner", "Partner code"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "izmjena_status",
        path: "NaloziProdaje/IzmjenaStatus/{timestamp}",
        description: "Orders whose status changed since timestamp (Magento watermark)",
        params: [p("timestamp", "dd.MM.yyyy. HH:mm:ss or date")],
        usedByMagento: true,
      },
      {
        action: "uid",
        path: "NaloziProdaje/uid/{uid}",
        description: "Single order by UID",
        params: [p("uid", "nalog_prodaje_uid")],
        usedByMagento: true,
      },
      {
        action: "b2b",
        path: "NaloziProdaje/b2b/{b2b}",
        description: "Single order by B2B key (e.g. Magento increment id)",
        params: [p("b2b", "B2B key")],
        usedByMagento: true,
      },
      {
        action: "dokumenti",
        path: "NaloziProdaje/dokumenti/{uid}/{file_uid}",
        description: "Order attached document",
        params: [
          p("uid", "Sales order UID"),
          p("file_uid", "File UID"),
        ],
      },
      {
        action: "placanja_predujmom",
        path: "NaloziProdaje/PlacanjaPredujmom/uid/{uid}",
        description: "Advance payments for order",
        params: [p("uid", "Sales order UID")],
      },
      {
        action: "dokumenti_isporuke_uid",
        path: "NaloziProdajeDokumentiIsporuke/uid/{uid}",
        description: "Delivery documents by order UID",
        params: [p("uid", "Sales order UID")],
      },
      {
        action: "dokumenti_isporuke_b2b",
        path: "NaloziProdajeDokumentiIsporuke/b2b/{b2b}",
        description: "Delivery documents by B2B key",
        params: [p("b2b", "Sales order B2B key")],
      },
      {
        action: "prijevoznica_pdf",
        path: "NaloziProdajePrijevoznice/pdf/{uid}",
        description: "Carrier / waybill PDF for order",
        params: [p("uid", "Sales order UID")],
      },
    ],
  },

  // ── Wholesale invoices ──────────────────────────────────────────────────
  {
    id: "vpracuni",
    title: "Wholesale invoices",
    description: "VP računi — wholesale invoices.",
    actions: [
      {
        action: "uid",
        path: "vpracuni/uid/{uid}",
        description: "One wholesale invoice by UID",
        params: [p("uid", "vprac_uid")],
      },
      {
        action: "broj",
        path: "vpracuni/broj/{pj_uid}/{broj}/{godina}",
        description: "By number/year",
        params: [
          p("pj_uid", "Business unit UID"),
          p("broj", "Invoice number"),
          p("godina", "Year"),
        ],
      },
      {
        action: "nalogprodaje",
        path: "vpracuni/nalogprodaje/{uid}",
        description: "Invoice for sales order",
        params: [p("uid", "Sales order UID")],
      },
      {
        action: "lista_period",
        path: "vpracuni/lista/period/{od_datuma}/{do_datuma}",
        description: "List by date period",
        params: [
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "lista_partner",
        path: "vpracuni/listapartner/{partner_uid}/{od_datuma}/{do_datuma}",
        description: "List by partner + period",
        params: [
          p("partner_uid", "Partner UID"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "lista_skladiste",
        path: "vpracuni/listaskladiste/{skladiste_uid}/{od_datuma}/{do_datuma}",
        description: "List by warehouse + period",
        params: [
          p("skladiste_uid", "Warehouse UID"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "pdf",
        path: "vpracuni/pdf/{uid}",
        description: "Wholesale invoice PDF (base64)",
        params: [p("uid", "Invoice UID")],
      },
    ],
  },
  {
    id: "racuni_predujma",
    title: "Advance payment invoices",
    description: "Računi predujma.",
    actions: [
      {
        action: "uid",
        path: "racunipredujma/uid/{uid}",
        description: "By UID",
        params: [p("uid", "Advance invoice UID")],
      },
      {
        action: "b2b",
        path: "racunipredujma/b2b/{b2b}",
        description: "By B2B key",
        params: [p("b2b", "B2B key")],
      },
      {
        action: "pdf",
        path: "racunipredujma/pdf/{uid}",
        description: "PDF by UID",
        params: [p("uid", "Advance invoice UID")],
      },
    ],
  },

  // ── Purchase / return / production orders ───────────────────────────────
  {
    id: "narudzbe",
    title: "Purchase orders (narudžbe)",
    description: "Purchase orders — retrieve and status changes.",
    actions: [
      {
        action: "statusi",
        path: "Narudzbe/statusi/{statusi}/{od_datuma?}/{do_datuma?}",
        description: "By status (+ optional dates)",
        params: [
          p("statusi", "Status codes", { list: true }),
          opt("od_datuma", "From date"),
          opt("do_datuma", "To date"),
        ],
      },
      {
        action: "partner",
        path: "Narudzbe/partner/{partner}/{od_datuma}/{do_datuma}",
        description: "By partner + dates",
        params: [
          p("partner", "Partner code"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "partner_statusi",
        path: "Narudzbe/partnerstatusi/{partner}/{statusi}/{od_datuma}/{do_datuma}",
        description: "By partner + statuses + dates",
        params: [
          p("partner", "Partner code"),
          p("statusi", "Status codes", { list: true }),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "izmjena_status",
        path: "Narudzbe/IzmjenaStatus/{timestamp}",
        description: "Status changes since timestamp",
        params: [p("timestamp", "Date/timestamp")],
      },
      {
        action: "uid",
        path: "Narudzbe/uid/{uid}",
        description: "Single order by UID",
        params: [p("uid", "Order UID")],
      },
      {
        action: "broj",
        path: "Narudzbe/broj/{broj}/{godina}/{skladiste}",
        description: "By number/year/warehouse",
        params: [
          p("broj", "Order number"),
          p("godina", "Year"),
          p("skladiste", "Warehouse code"),
        ],
      },
      {
        action: "zaprimljene_kolicine",
        path: "Narudzbe/ZaprimljeneKolicine/uid/{uid}",
        description: "Received quantities for order",
        params: [p("uid", "Order UID")],
      },
    ],
  },
  {
    id: "nalozi_povrata",
    title: "Return orders",
    description: "Return orders (NaloziPovrata).",
    actions: [
      {
        action: "uid",
        path: "NaloziPovrata/uid/{uid}",
        description: "By UID",
        params: [p("uid", "Return order UID")],
      },
      {
        action: "b2b",
        path: "NaloziPovrata/b2b/{b2b}",
        description: "By B2B key",
        params: [p("b2b", "B2B key")],
      },
      {
        action: "izmjena_status",
        path: "NaloziPovrata/IzmjenaStatus/{timestamp}",
        description: "Status changes since timestamp",
        params: [p("timestamp", "Date/timestamp")],
      },
      {
        action: "zaprimljene_kolicine",
        path: "NaloziPovrata/ZaprimljeneKolicine/{uid}",
        description: "Received quantities",
        params: [p("uid", "Return order UID")],
      },
    ],
  },
  {
    id: "nalozi_proizvodnje",
    title: "Production orders",
    description: "Production orders (NaloziProizvodnje).",
    actions: [
      {
        action: "uid",
        path: "NaloziProizvodnje/uid/{uid}",
        description: "By UID",
        params: [p("uid", "Production order UID")],
      },
      {
        action: "statusi",
        path: "NaloziProizvodnje/statusi/{statusi}/{od_datuma?}/{do_datuma?}",
        description: "By status (+ optional dates)",
        params: [
          p("statusi", "Status codes", { list: true }),
          opt("od_datuma", "From date"),
          opt("do_datuma", "To date"),
        ],
      },
      {
        action: "partner",
        path: "NaloziProizvodnje/partner/{partner}/{od_datuma}/{do_datuma}",
        description: "By partner + dates",
        params: [
          p("partner", "Partner code"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "izmjena_status",
        path: "NaloziProizvodnje/IzmjenaStatus/{timestamp}",
        description: "Status changes since timestamp",
        params: [p("timestamp", "Date/timestamp")],
      },
      {
        action: "dokumenti_isporuke_uid",
        path: "NaloziProizvodnjeDokumentiIsporuke/uid/{uid}",
        description: "Delivery docs by UID",
        params: [p("uid", "Production order UID")],
      },
      {
        action: "dokumenti_isporuke_b2b",
        path: "NaloziProizvodnjeDokumentiIsporuke/b2b/{b2b}",
        description: "Delivery docs by B2B",
        params: [p("b2b", "B2B key")],
      },
    ],
  },
  {
    id: "radni_nalozi",
    title: "Work / service orders",
    description: "Radni nalozi (service work orders).",
    actions: [
      {
        action: "uid",
        path: "RadniNalozi/uid/{uid}",
        description: "By UID",
        params: [p("uid", "Work order UID")],
      },
      {
        action: "webkod",
        path: "RadniNalozi/webkod/{webkod}",
        description: "By web code",
        params: [p("webkod", "Web code")],
      },
      {
        action: "partner",
        path: "RadniNalozi/partner/{partner}/{od_datuma}/{do_datuma}",
        description: "By partner code + dates",
        params: [
          p("partner", "Partner code"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "partner_uid",
        path: "RadniNalozi/partneruid/{partner_uid}/{od_datuma}/{do_datuma}",
        description: "By partner UID + dates",
        params: [
          p("partner_uid", "Partner UID"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "stavke",
        path: "RadniNalozi/stavke/{b2b}",
        description: "Line items by B2B key",
        params: [p("b2b", "Work-order line B2B key")],
      },
    ],
  },
  {
    id: "skladisni_dokumenti",
    title: "Warehouse documents",
    description: "Skladišni dokumenti.",
    actions: [
      {
        action: "uid",
        path: "SkladisniDokumenti/uid/{uid}",
        description: "By UID",
        params: [p("uid", "Document UID")],
      },
      {
        action: "barcode",
        path: "SkladisniDokumenti/LuceedBarcode/{barcode}",
        description: "By Luceed barcode",
        params: [p("barcode", "Document barcode")],
      },
    ],
  },

  // ── Hotel ───────────────────────────────────────────────────────────────
  {
    id: "hotel",
    title: "Hotel",
    description: "Hotel reservations, registrations, guest overview.",
    actions: [
      {
        action: "rezervacije_lista",
        path: "hotelrezervacije/lista/{tip_datuma}/{od_datuma}/{do_datuma}",
        description: "Reservations by date type + range",
        params: [
          p("tip_datuma", "Date type code"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "rezervacije_uid",
        path: "hotelrezervacije/uid/{uid}",
        description: "One reservation by UID",
        params: [p("uid", "Reservation UID")],
      },
      {
        action: "prijave",
        path: "hotel/prijave/{hotel_uid}/{rezervacija_uid}/{voucher?}",
        description: "Hotel registrations",
        params: [
          p("hotel_uid", "Hotel UID"),
          p("rezervacija_uid", "Reservation UID"),
          opt("voucher", "Optional voucher"),
        ],
      },
      {
        action: "lista",
        path: "hotel/lista/{smjestaj}/{tip_datuma}/{od_datuma}/{do_datuma}",
        description: "Hotel occupancy / list",
        params: [
          p("smjestaj", "Accommodation unit"),
          p("tip_datuma", "Date type"),
          p("od_datuma", "From date"),
          p("do_datuma", "To date"),
        ],
      },
      {
        action: "gosti",
        path: "hotelgosti/lista/{datum}/{smjestaj?}",
        description: "Guest overview for date",
        params: [
          p("datum", "Date"),
          opt("smjestaj", "Optional accommodation unit"),
        ],
      },
    ],
  },

  // ── Misc ────────────────────────────────────────────────────────────────
  {
    id: "poklon_bonovi",
    title: "Gift vouchers",
    description: "Gift voucher validity / balance.",
    actions: [
      {
        action: "stanje",
        path: "PoklonBonovi/Stanje/serijskibroj/{serijski}",
        description: "Balance by serial number",
        params: [p("serijski", "Voucher serial number")],
      },
    ],
  },
];

/** Flatten for discovery / docs */
export function listAllActions(): Array<{
  tool: string;
  resource: string;
  action: string;
  path: string;
  description: string;
  usedByMagento?: boolean;
}> {
  const out = [];
  for (const r of CATALOG) {
    for (const a of r.actions) {
      out.push({
        tool: `luceed_${r.id}`,
        resource: r.id,
        action: a.action,
        path: a.path,
        description: a.description,
        usedByMagento: a.usedByMagento,
      });
    }
  }
  return out;
}

export function catalogStats() {
  const actions = listAllActions();
  return {
    resources: CATALOG.length,
    actions: actions.length,
    magentoActions: actions.filter((a) => a.usedByMagento).length,
  };
}
