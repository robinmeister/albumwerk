// Demo seed, require()d from seed_demo.pb.js (JSVM handlers are isolated).
// Creates an app admin + customer, demo branding, a shooting with generated
// photos (ImageMagick, same toolchain as previewlib.js) and one open order.
// Fixed record ids + the "instance is empty" guard make this idempotent and
// safe: it never runs on an instance that already contains users/shootings.
//
// seedDemo(app) -> true when demo data was created.
module.exports = function seedDemo(app) {
  const SHOOTING_ID = "demoshooting001";
  const ADMIN_ID = "demoadmin000001";
  const CUSTOMER_ID = "democustomer001";
  const PASSWORD = "demo123456";

  // onBootstrap fires before automigrations on a fresh database — in that
  // case the collections don't exist yet and a later bootstrap (the entrypoint
  // runs `pocketbase migrate` first) picks the seeding up.
  try {
    app.findCollectionByNameOrId("shootings");
  } catch (_) {
    return false;
  }

  const hasRecords = (name) =>
    app.findRecordsByFilter(name, "id != ''", "", 1, 0).length > 0;
  if (hasRecords("shootings") || hasRecords("users")) return false;

  // --- branding first, so the generated previews already carry the demo
  // watermark text ----------------------------------------------------------
  try {
    const settings = app.findRecordById("settings", "appsettings0001");
    settings.set("businessName", "Demo Fotostudio");
    settings.set("shortName", "Demo");
    settings.set("tagline", "Deine Erinnerungen, professionell festgehalten");
    settings.set("contactEmail", "hallo@demo.test");
    settings.set("orderNotificationEmail", "bestellungen@demo.test");
    settings.set("watermarkText", "DEMO FOTOSTUDIO");
    settings.set("setupCompleted", true); // wizard is reachable via /branding?setup=1
    app.save(settings);
  } catch (err) {
    app.logger().warn("demo seed: settings update failed", "error", String(err));
  }

  // --- users ----------------------------------------------------------------
  const usersCol = app.findCollectionByNameOrId("users");

  const admin = new Record(usersCol);
  admin.set("id", ADMIN_ID);
  admin.set("email", "admin@demo.test");
  admin.set("emailVisibility", false);
  admin.set("firstName", "Demo");
  admin.set("lastName", "Admin");
  admin.set("isAdmin", true);
  admin.set("verified", true);
  admin.set("shootingIds", []);
  admin.setPassword(PASSWORD);
  app.save(admin);

  const customer = new Record(usersCol);
  customer.set("id", CUSTOMER_ID);
  customer.set("email", "kunde@demo.test");
  customer.set("emailVisibility", false);
  customer.set("firstName", "Kim");
  customer.set("lastName", "Muster");
  customer.set("isAdmin", false);
  customer.set("verified", true);
  customer.set("shootingIds", [SHOOTING_ID]);
  customer.set("phone", "+49 170 1234567");
  customer.set("street", "Musterweg 12");
  customer.set("zip", "12345");
  customer.set("city", "Musterstadt");
  customer.setPassword(PASSWORD);
  app.save(customer);

  // --- generated demo photos -------------------------------------------------
  const shots = [
    { label: "Demo 1", gradient: "#3d4a3d-#9db08a" },
    { label: "Demo 2", gradient: "#b08d57-#f0e0c8" },
    { label: "Demo 3", gradient: "#41506b-#a9b8d4" },
    { label: "Demo 4", gradient: "#6b4141-#d4a9a9" },
    { label: "Demo 5", gradient: "#31575a-#9fc7c2" },
    { label: "Demo 6", gradient: "#5c4a6b-#c7b3d4" },
  ];
  const tmpFiles = shots.map((shot, i) => {
    const path = $os.tempDir() + "/pb_demo_seed_" + (i + 1) + ".jpg";
    $os.cmd(
      "magick", "-size", "1600x1067", "gradient:" + shot.gradient,
      // alpine's ImageMagick has no default font — DejaVu ships in the image
      "-font", "DejaVu-Sans", "-pointsize", "110",
      "-fill", "rgba(255,255,255,0.9)",
      "-gravity", "center", "-annotate", "0", shot.label,
      "-quality", "85", path,
    ).output();
    return path;
  });

  try {
    // --- shooting (prices/packages come from the migration seeds) ------------
    const shootingsCol = app.findCollectionByNameOrId("shootings");
    const shooting = new Record(shootingsCol);
    shooting.set("id", SHOOTING_ID);
    shooting.set("title", "Demo-Shooting: Familie Muster");
    shooting.set("description", "Beispiel-Shooting mit generierten Demo-Bildern");
    shooting.set("type", "Familie");
    shooting.set("priceIds", [
      "defaultprice001", "defaultprice002", "defaultprice003", "defaultprice004",
    ]);
    shooting.set("userIds", [CUSTOMER_ID]);
    shooting.set("withUserSelection", false);
    shooting.set("coverImage", [$filesystem.fileFromPath(tmpFiles[0])]);
    app.save(shooting);

    // --- images: previews.pb.js auto-creates the watermarked previews --------
    const imagesCol = app.findCollectionByNameOrId("images");
    tmpFiles.forEach((path, i) => {
      const image = new Record(imagesCol);
      image.set("id", "demoimage00000" + (i + 1));
      image.set("shootingId", SHOOTING_ID);
      image.set("type", "original");
      image.set("name", "demo-0" + (i + 1) + ".jpg");
      image.set("originalFile", $filesystem.fileFromPath(path));
      app.save(image);
    });

    // --- login screen image -----------------------------------------------
    const loginCol = app.findCollectionByNameOrId("loginImages");
    const loginImage = new Record(loginCol);
    loginImage.set("id", "demologinimg001");
    loginImage.set("title", "Demo");
    loginImage.set("file", [$filesystem.fileFromPath(tmpFiles[2])]);
    app.save(loginImage);
  } finally {
    tmpFiles.forEach((path) => {
      try { $os.remove(path); } catch (_) { /* best effort */ }
    });
  }

  // --- one open order for the admin "Bestellungen" page ----------------------
  // imagePriceObjectList is stored as a JSON string, mirroring PricingPage.tsx
  const imagePriceObjectList = [
    {
      image: "demo-01.jpg",
      price: [
        { id: "defaultprice001", title: "Digitales Bild", description: "Einzelbild in voller Auflösung als Download", amount: "15", isDownloadable: true, quantity: 1 },
        { id: "defaultprice002", title: "Abzug 13x18", description: "Klassischer Fotoabzug im Format 13 x 18 cm", amount: "5", isDownloadable: false, quantity: 2 },
      ],
    },
    {
      image: "demo-03.jpg",
      price: [
        { id: "defaultprice003", title: "Abzug 20x30", description: "Fotoabzug im Format 20 x 30 cm", amount: "12", isDownloadable: false, quantity: 1 },
      ],
    },
  ];
  const ordersCol = app.findCollectionByNameOrId("finishedOrders");
  const order = new Record(ordersCol);
  order.set("id", "demoorder000001");
  order.set("orderId", "demoorder000001");
  order.set("userId", CUSTOMER_ID);
  order.set("shootingId", SHOOTING_ID);
  order.set("imagePriceObjectList", JSON.stringify(imagePriceObjectList));
  order.set("userEmail", "kunde@demo.test");
  order.set("shootingTitle", "Demo-Shooting: Familie Muster");
  order.set("totalPrice", 37);
  order.set("finished", false);
  app.save(order);

  return true;
};
