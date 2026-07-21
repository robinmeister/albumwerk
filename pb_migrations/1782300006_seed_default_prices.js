/// <reference path="../pb_data/types.d.ts" />
// Seed a starter price list so a fresh instance is usable out of the box.
// Only runs when both collections are empty — existing installations keep
// their data. The photographer adjusts everything under /pricing afterwards.
migrate((app) => {
  const hasRecords = (name) =>
    app.findRecordsByFilter(name, "id != ''", "", 1, 0).length > 0;
  if (hasRecords("prices") || hasRecords("packages")) return;

  const defaultPrices = [
    {
      id: "defaultprice001",
      title: "Digitales Bild",
      description: "Einzelbild in voller Auflösung als Download",
      amount: 15,
      isDownloadable: true,
    },
    {
      id: "defaultprice002",
      title: "Abzug 13x18",
      description: "Klassischer Fotoabzug im Format 13 x 18 cm",
      amount: 5,
      isDownloadable: false,
    },
    {
      id: "defaultprice003",
      title: "Abzug 20x30",
      description: "Fotoabzug im Format 20 x 30 cm",
      amount: 12,
      isDownloadable: false,
    },
    {
      id: "defaultprice004",
      title: "Leinwand 40x60",
      description: "Dein Foto auf Leinwand im Format 40 x 60 cm",
      amount: 79,
      isDownloadable: false,
    },
  ];

  const defaultPackages = [
    {
      id: "defaultpack0001",
      name: "Kleines Paket", // legacy required duplicate of title
      title: "Kleines Paket",
      numberOfImages: 10,
      totalPrice: "99",
      singlePrice: "8",
    },
    {
      id: "defaultpack0002",
      name: "Grosses Paket",
      title: "Grosses Paket",
      numberOfImages: 25,
      totalPrice: "199",
      singlePrice: "6",
    },
  ];

  const pricesCollection = app.findCollectionByNameOrId("prices");
  defaultPrices.forEach((data) => {
    const record = new Record(pricesCollection);
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    app.save(record);
  });

  const packagesCollection = app.findCollectionByNameOrId("packages");
  defaultPackages.forEach((data) => {
    const record = new Record(packagesCollection);
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    app.save(record);
  });
}, (app) => {
  const seededIds = {
    prices: ["defaultprice001", "defaultprice002", "defaultprice003", "defaultprice004"],
    packages: ["defaultpack0001", "defaultpack0002"],
  };
  Object.keys(seededIds).forEach((name) => {
    seededIds[name].forEach((id) => {
      try {
        app.delete(app.findRecordById(name, id));
      } catch (_) {
        /* already removed */
      }
    });
  });
});
