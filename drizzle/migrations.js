// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from "./meta/_journal.json";
import m0000 from "./0000_black_omega_sentinel.sql";
import m0001 from "./0001_glorious_wild_pack.sql";
import m0002 from "./0002_overjoyed_firebird.sql";
import m0003 from "./0003_unknown_doctor_faustus.sql";

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
  },
};
