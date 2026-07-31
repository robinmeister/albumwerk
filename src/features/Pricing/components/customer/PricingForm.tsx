import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Plus as Add, ArrowLeft as ArrowBack, ArrowRight as ArrowForward, X as Close, CheckCheck as DoneAll, Download, Minus as Remove } from "lucide-react";
import { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { ImagePriceObject, Price } from "../../../../utils/types";
import { thumbUrl } from "../../../Album/components/AlbumImage";
import { calculateTotalPrice } from "../../utils/functions";
import { CATEGORY_LABELS, groupPrices } from "../../utils/catalog";

type Props = {
  prices: Price[];
  selectedImages: string[];
  setSelectedImages: (images: string[]) => void;
  imagePriceObjectList: ImagePriceObject[];
  setImagePriceObjectList: (list: ImagePriceObject[]) => void;
  onContinue: () => void;
};

const DESKTOP = "@media (min-width: 900px)";

const s = stylex.create({
  root: { paddingBottom: 80 },
  empty: { textAlign: "center", padding: "64px 16px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" },
  grid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", [DESKTOP]: "5fr 7fr" },
    gap: 24,
  },
  // Ohne minWidth:0 ist die 1fr-Spur minmax(auto, 1fr) und kann nicht unter die
  // Eigenbreite des Vorschaubildes schrumpfen — die Seite scrollte auf dem Handy
  // waagerecht (486px Inhalt bei 390px Viewport).
  col: { minWidth: 0 },
  preview: {
    position: "relative",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-container)",
    overflow: "hidden",
    backgroundColor: "var(--color-background-muted)",
    aspectRatio: "4 / 3",
  },
  previewImg: { width: "100%", height: "100%", objectFit: "contain" },
  deselect: { position: "absolute", top: 8, right: 8 },
  navRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  strip: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 },
  thumb: (state: "current" | "priced" | "plain") => ({
    width: 48,
    height: 48,
    cursor: "pointer",
    borderRadius: "var(--radius-element)",
    overflow: "hidden",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor:
      state === "current" ? "var(--color-accent)"
        : state === "priced" ? "var(--color-success)"
          : "var(--color-border)",
    opacity: state === "current" ? 1 : 0.65,
    transition: "opacity 0.15s, border-color 0.15s",
  }),
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  colHead: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  group: { marginBottom: 12 },
  groupLabel: { letterSpacing: "0.08em", fontSize: "0.68rem" },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: "var(--radius-element)",
    borderWidth: 1,
    borderStyle: "solid",
    transition: "border-color 0.15s, background-color 0.15s",
    borderColor: { default: "var(--color-border)", ":hover": "var(--color-accent)" },
  },
  rowSelected: {
    borderColor: "var(--color-accent)",
    backgroundColor: "var(--color-background-muted)",
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { display: "flex", alignItems: "center", gap: 6 },
  qty: { display: "flex", alignItems: "center", gap: 4 },
  qtyNum: { minWidth: 20, textAlign: "center", fontVariantNumeric: "tabular-nums" },
  secNav: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  bar: {
    position: "fixed",
    left: { default: 0, [DESKTOP]: 240 }, // 240 = AppShell SIDEBAR_WIDTH (literal for StyleX)
    right: 0,
    bottom: 0,
    zIndex: 1100,
    paddingInline: { default: 12, [DESKTOP]: 24 },
    paddingBlock: 10,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    borderTop: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-surface)",
    boxShadow: "0 -4px 16px rgba(0,0,0,0.12)",
  },
  barRight: { marginLeft: "auto", display: "flex", gap: 8 },
  link: { cursor: "pointer" },
});

export default function PricingForm(props: Props): ReactElement {
  const {
    prices,
    selectedImages,
    setSelectedImages,
    imagePriceObjectList,
    setImagePriceObjectList,
    onContinue,
  } = props;
  const navigate = useNavigate();

  const [currentImage, setCurrentImage] = useState<string>(selectedImages[0]);

  // keep exactly one entry per selected image, preserving existing picks
  useEffect(() => {
    const list = selectedImages.map(
      (image) =>
        imagePriceObjectList.find((x) => x.image === image) ?? { image, price: [] }
    );
    if (
      list.length !== imagePriceObjectList.length ||
      list.some((entry, i) => entry !== imagePriceObjectList[i])
    ) {
      setImagePriceObjectList(list);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImages]);

  const currentEntry = imagePriceObjectList.find((x) => x.image === currentImage);
  const currentIndex = selectedImages.indexOf(currentImage);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === selectedImages.length - 1;

  const pricedCount = imagePriceObjectList.filter((o) => o.price.length > 0).length;
  const allPriced = pricedCount === selectedImages.length && selectedImages.length > 0;

  const quantityOf = (priceId: string): number =>
    currentEntry?.price.find((p) => p.id === priceId)?.quantity ?? 0;

  function setQuantity(price: Price, quantity: number) {
    setImagePriceObjectList(
      imagePriceObjectList.map((obj) => {
        if (obj.image !== currentImage) return obj;
        const rest = obj.price.filter((p) => p.id !== price.id);
        return {
          ...obj,
          price: quantity > 0 ? [...rest, { ...price, quantity }] : rest,
        };
      })
    );
  }

  function applyToAll() {
    const template = currentEntry?.price ?? [];
    if (template.length === 0) return;
    setImagePriceObjectList(
      imagePriceObjectList.map((obj) => ({
        ...obj,
        price: template.map((p) => ({ ...p })),
      }))
    );
    toast.success("Auswahl für alle Bilder übernommen");
  }

  function jumpToNextUnpriced() {
    const next = imagePriceObjectList.find((o) => o.price.length === 0);
    if (next) setCurrentImage(next.image);
  }

  function handleDeselect() {
    const idx = selectedImages.indexOf(currentImage);
    const next =
      idx < selectedImages.length - 1
        ? selectedImages[idx + 1]
        : selectedImages[idx - 1];
    setSelectedImages(selectedImages.filter((img) => img !== currentImage));
    if (next) setCurrentImage(next);
  }

  /* ── No images selected ── */
  if (selectedImages.length === 0) {
    return (
      <div {...stylex.props(s.empty)}>
        <Heading level={6}>Keine Bilder ausgewählt</Heading>
        <Text type="body" color="secondary">
          Wähle zuerst im Album die Bilder aus, die du kaufen möchtest.
        </Text>
        <Button variant="primary" label="Zum Album" onClick={() => navigate("/album")} />
      </div>
    );
  }

  /* ── Sticky summary bar ── */
  const summaryBar = (
    <div {...stylex.props(s.bar)}>
      <div>
        <Text type="body" weight="semibold">
          {calculateTotalPrice(imagePriceObjectList)} €
        </Text>
        <Text
          type="supporting"
          color={allPriced ? "accent" : "secondary"}
          xstyle={allPriced ? undefined : s.link}
          onClick={allPriced ? undefined : jumpToNextUnpriced}
        >
          {allPriced
            ? "Alle Bilder bepreist"
            : `${pricedCount} von ${selectedImages.length} Bildern bepreist — zum nächsten offenen Bild`}
        </Text>
      </div>
      <div {...stylex.props(s.barRight)}>
        <Button
          variant="primary"
          endContent={<ArrowForward />}
          isDisabled={!allPriced}
          tooltip={allPriced ? undefined : "Bitte wähle für jedes Bild mindestens ein Produkt"}
          label="Weiter zur Bezahlung"
          onClick={onContinue}
        />
      </div>
    </div>
  );

  /* ── Main: image + price selection ── */
  return (
    <div {...stylex.props(s.root)}>
      <div {...stylex.props(s.grid)}>
        {/* ── Left column: image preview + thumbnail strip ── */}
        <div {...stylex.props(s.col)}>
          <div {...stylex.props(s.preview)}>
            <img src={currentImage} alt={`Bild ${currentIndex + 1}`} {...stylex.props(s.previewImg)} />
            <div {...stylex.props(s.deselect)}>
              <IconButton
                variant="secondary"
                icon={<Close />}
                label="Bild abwählen"
                tooltip="Bild abwählen"
                isDisabled={selectedImages.length === 1}
                onClick={handleDeselect}
              />
            </div>
          </div>

          {/* Image navigation */}
          <div {...stylex.props(s.navRow)}>
            <IconButton
              variant="ghost"
              icon={<ArrowBack />}
              label="Vorheriges Bild"
              isDisabled={isFirst}
              onClick={() => setCurrentImage(selectedImages[currentIndex - 1])}
            />
            <Text type="body" color="secondary">
              Bild {currentIndex + 1} von {selectedImages.length}
            </Text>
            <IconButton
              variant="ghost"
              icon={<ArrowForward />}
              label="Nächstes Bild"
              isDisabled={isLast}
              onClick={() => setCurrentImage(selectedImages[currentIndex + 1])}
            />
          </div>

          {/* Thumbnail strip */}
          <div {...stylex.props(s.strip)}>
            {selectedImages.map((img, idx) => {
              const hasPrices =
                (imagePriceObjectList.find((x) => x.image === img)?.price?.length ?? 0) > 0;
              const isCurrent = img === currentImage;
              const state = isCurrent ? "current" : hasPrices ? "priced" : "plain";
              return (
                <div
                  key={img}
                  onClick={() => setCurrentImage(img)}
                  {...stylex.props(s.thumb(state))}
                >
                  <img src={thumbUrl(img)} alt={`Bild ${idx + 1}`} {...stylex.props(s.thumbImg)} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right column: product selection for the current image ── */}
        {/* data-testid: Ankerpunkt für die E2E-Suite (Screenshot-Zuschnitt). */}
        <div data-testid="produktliste" {...stylex.props(s.col)}>
          <div {...stylex.props(s.colHead)}>
            <Text type="large" weight="semibold">
              Produkte für Bild {currentIndex + 1}
            </Text>
            <Button
              size="sm"
              variant="secondary"
              icon={<DoneAll />}
              isDisabled={(currentEntry?.price.length ?? 0) === 0}
              tooltip="Überträgt die Produktauswahl dieses Bildes auf alle ausgewählten Bilder"
              label="Für alle Bilder übernehmen"
              onClick={applyToAll}
            />
          </div>

          {groupPrices(prices).map((group) => (
            <div key={group.category} {...stylex.props(s.group)}>
              <Text type="supporting" color="secondary" xstyle={s.groupLabel}>
                {CATEGORY_LABELS[group.category]}
              </Text>
              {group.items.map((price) => {
                const quantity = quantityOf(price.id);
                const selected = quantity > 0;
                // a digital download makes no sense more than once per image
                const maxReached = price.isDownloadable && quantity >= 1;
                return (
                  <div
                    key={price.id}
                    onClick={() => { if (!selected) setQuantity(price, 1); }}
                    {...stylex.props(s.row, selected && s.rowSelected)}
                  >
                    <div {...stylex.props(s.rowMain)}>
                      <div {...stylex.props(s.rowTitle)}>
                        <Text type="body" weight="semibold" maxLines={1}>
                          {price.title}
                        </Text>
                        {price.isDownloadable && (
                          <Badge variant="info" icon={<Download style={{ fontSize: 14 }} />} label="Download" />
                        )}
                      </div>
                      {price.description && (
                        <Text type="supporting" color="secondary" maxLines={1}>
                          {price.description}
                        </Text>
                      )}
                    </div>
                    <Text type="body" weight="semibold">{price.amount} €</Text>
                    <div {...stylex.props(s.qty)} onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        variant="ghost"
                        icon={<Remove />}
                        label="Weniger"
                        isDisabled={quantity === 0}
                        onClick={() => setQuantity(price, quantity - 1)}
                      />
                      <span {...stylex.props(s.qtyNum)}>
                        <Text type="body" weight="semibold">{quantity}</Text>
                      </span>
                      <IconButton
                        variant="ghost"
                        icon={<Add />}
                        label="Mehr"
                        isDisabled={maxReached}
                        onClick={() => setQuantity(price, quantity + 1)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* secondary navigation below the product list */}
          <div {...stylex.props(s.secNav)}>
            {!isLast && (
              <Button
                variant="secondary"
                endContent={<ArrowForward />}
                isDisabled={(currentEntry?.price.length ?? 0) === 0}
                label="Nächstes Bild"
                onClick={() => setCurrentImage(selectedImages[currentIndex + 1])}
              />
            )}
          </div>
        </div>
      </div>
      {summaryBar}
    </div>
  );
}
