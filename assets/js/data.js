/* =========================================================
   Bowe's Mini Bus Service - demo data layer
   ---------------------------------------------------------
   Everything here runs in the browser using localStorage so
   the site works as a static deployment on Vercel. When a
   real backend/database is added, replace the functions in
   `BowesStore` with fetch() calls to your API. The rest of
   the site only talks to this file.
   ========================================================= */

(function () {
  "use strict";

  const LS_KEY = "bowes_data_v1";

  /* ---------- helpers ---------- */

  function todayISO(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  /* ---------- seed data (first visit only) ---------- */

  function seed() {
    return {
      fleet: [
        { id: "bus_1", name: "Mercedes Sprinter", reg: "191-LS-1024", seats: 16, type: "Minibus", status: "active", notes: "Wheelchair accessible lift" },
        { id: "bus_2", name: "Ford Transit", reg: "182-LS-3377", seats: 14, type: "Minibus", status: "active", notes: "" },
        { id: "bus_3", name: "Iveco Daily", reg: "201-LS-8891", seats: 19, type: "Midi bus", status: "active", notes: "Luggage trailer available" },
        { id: "bus_4", name: "Volkswagen Crafter", reg: "172-LS-5560", seats: 12, type: "Minibus", status: "maintenance", notes: "In for service until further notice" }
      ],
      drivers: [
        { id: "drv_1", name: "Pat Bowe", phone: "PLACEHOLDER-PHONE", licence: "D", daysOff: ["Sunday"] },
        { id: "drv_2", name: "Mary O'Neill", phone: "PLACEHOLDER-PHONE", licence: "D1", daysOff: ["Monday", "Tuesday"] },
        { id: "drv_3", name: "John Kavanagh", phone: "PLACEHOLDER-PHONE", licence: "D", daysOff: [] }
      ],
      bookings: [
        {
          id: "bk_seed1", name: "Portlaoise GAA Club", email: "secretary@example.com", phone: "PLACEHOLDER",
          date: todayISO(2), time: "08:30", pickup: "Portlaoise", destination: "Croke Park, Dublin",
          passengers: 15, returnTrip: true, notes: "Return trip, collection after the match.",
          status: "confirmed", busId: "bus_1", driverId: "drv_1", createdAt: todayISO(-6)
        },
        {
          id: "bk_seed2", name: "Walsh Wedding Party", email: "walsh@example.com", phone: "PLACEHOLDER",
          date: todayISO(4), time: "13:00", pickup: "Mountrath", destination: "Mount Juliet Estate",
          passengers: 18, returnTrip: false, notes: "Two runs may be needed.",
          status: "confirmed", busId: "bus_3", driverId: "drv_3", createdAt: todayISO(-4)
        },
        {
          id: "bk_seed3", name: "Community Active Retirement", email: "info@example.com", phone: "PLACEHOLDER",
          date: todayISO(7), time: "10:00", pickup: "Abbeyleix", destination: "Waterford Greenway",
          passengers: 12, returnTrip: true, notes: "",
          status: "pending", busId: null, driverId: null, createdAt: todayISO(-1)
        },
        {
          id: "bk_seed4", name: "Local School Tour", email: "school@example.com", phone: "PLACEHOLDER",
          date: todayISO(-3), time: "09:00", pickup: "Portlaoise", destination: "Dublin Zoo",
          passengers: 16, returnTrip: true, notes: "",
          status: "completed", busId: "bus_1", driverId: "drv_2", createdAt: todayISO(-14)
        },
        {
          id: "bk_seed5", name: "Murphy Stag Party", email: "murphy@example.com", phone: "PLACEHOLDER",
          date: todayISO(-10), time: "18:00", pickup: "Portlaoise", destination: "Carlow Town",
          passengers: 13, returnTrip: true, notes: "",
          status: "completed", busId: "bus_2", driverId: "drv_1", createdAt: todayISO(-20)
        },
        {
          id: "bk_seed6", name: "Brennan Airport Run", email: "brennan@example.com", phone: "PLACEHOLDER",
          date: todayISO(1), time: "04:30", pickup: "Portlaoise", destination: "Dublin Airport",
          passengers: 8, returnTrip: false, notes: "Early start.",
          status: "confirmed", busId: "bus_2", driverId: "drv_3", createdAt: todayISO(-2)
        },
        {
          id: "bk_seed7", name: "Doyle Hen Party", email: "doyle@example.com", phone: "PLACEHOLDER",
          date: todayISO(12), time: "17:00", pickup: "Portarlington", destination: "Kilkenny",
          passengers: 14, returnTrip: true, notes: "",
          status: "declined", busId: null, driverId: null, createdAt: todayISO(-3)
        }
      ]
    };
  }

  /* ---------- storage ---------- */

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* corrupted or unavailable storage, fall through to seed */ }
    const data = seed();
    save(data);
    return data;
  }

  function save(data) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
  }

  /* ---------- availability logic ----------
     A bus is unavailable on a date if it is in maintenance or
     already has a confirmed booking that day. Pending bookings
     do not block a bus (they haven't been approved yet).      */

  function busesAvailableOn(data, dateISO, passengers) {
    const takenBusIds = data.bookings
      .filter(b => b.status === "confirmed" && b.date === dateISO && b.busId)
      .map(b => b.busId);
    return data.fleet.filter(bus =>
      bus.status === "active" &&
      !takenBusIds.includes(bus.id) &&
      (!passengers || bus.seats >= passengers)
    );
  }

  function weekdayName(dateISO) {
    return new Date(dateISO + "T12:00:00").toLocaleDateString("en-IE", { weekday: "long" });
  }

  function driversAvailableOn(data, dateISO) {
    const day = weekdayName(dateISO);
    const busyDriverIds = data.bookings
      .filter(b => b.status === "confirmed" && b.date === dateISO && b.driverId)
      .map(b => b.driverId);
    return data.drivers.filter(d => !d.daysOff.includes(day) && !busyDriverIds.includes(d.id));
  }

  /* ---------- public API ---------- */

  window.BowesStore = {
    get: load,
    set: save,
    uid: uid,
    todayISO: todayISO,
    weekdayName: weekdayName,
    busesAvailableOn: busesAvailableOn,
    driversAvailableOn: driversAvailableOn,

    addBooking(booking) {
      const data = load();
      const record = Object.assign({
        id: uid("bk"),
        status: "pending",      // every public booking starts as pending review
        busId: null,
        driverId: null,
        createdAt: todayISO()
      }, booking);
      data.bookings.push(record);
      save(data);
      return record;
    },

    updateBooking(id, patch) {
      const data = load();
      const b = data.bookings.find(x => x.id === id);
      if (b) { Object.assign(b, patch); save(data); }
      return b;
    },

    addBus(bus) {
      const data = load();
      const record = Object.assign({ id: uid("bus"), status: "active", notes: "" }, bus);
      data.fleet.push(record);
      save(data);
      return record;
    },

    updateBus(id, patch) {
      const data = load();
      const bus = data.fleet.find(x => x.id === id);
      if (bus) { Object.assign(bus, patch); save(data); }
      return bus;
    },

    addDriver(driver) {
      const data = load();
      const record = Object.assign({ id: uid("drv"), daysOff: [] }, driver);
      data.drivers.push(record);
      save(data);
      return record;
    },

    updateDriver(id, patch) {
      const data = load();
      const d = data.drivers.find(x => x.id === id);
      if (d) { Object.assign(d, patch); save(data); }
      return d;
    },

    reset() {
      localStorage.removeItem(LS_KEY);
      return load();
    }
  };
})();
