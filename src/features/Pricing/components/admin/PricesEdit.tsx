import { ReactElement } from "react";
import { Cancel, Delete, Edit, Save } from "@mui/icons-material";
import {
  Card,
  CardContent,
  Grid,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";

import { Price } from "../../../../utils/types";

type Props = {
  prices: Price[];
  setPrices: (prices: Price[]) => void;
  activePrice: Price | undefined;
  setActivePrice: (tier: Price) => void;
  handleUpdate: (tier: Price, index: number) => Promise<void>;
  handleDelete: (tier: Price) => Promise<void>;
  handleEdit: (index: number, type: string) => void;
  handleCancel: (index: number, type: string) => void;
  openDeleteModal: boolean;
  setOpenDeleteModal: (open: boolean) => void;
  edit: boolean[];
  setEdit: (edit: boolean[]) => void;
};

export default function PriceEdit(props: Props): ReactElement {
  const {
    prices,
    setPrices,
    setActivePrice,
    handleUpdate,
    handleEdit,
    edit,
    handleCancel,
    setOpenDeleteModal,
  } = props;
  return (
    <>
      {prices.map((tier: Price, index) => {
        return (
          <Grid key={tier.id} item xs={12} md={4} lg={4}>
            <form>
              <Card>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="h6">Preis {index + 1}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      {!edit[index] && (
                        <IconButton
                          sx={{ float: "right" }}
                          onClick={() => handleEdit(index, "price")}
                        >
                          <Edit />
                        </IconButton>
                      )}
                      {edit[index] && (
                        <>
                          <IconButton
                            sx={{ float: "right" }}
                            onClick={() => handleUpdate(tier, index)}
                          >
                            <Save />
                          </IconButton>
                          <IconButton
                            sx={{ float: "right" }}
                            onClick={() => handleCancel(index, "price")}
                          >
                            <Cancel />
                          </IconButton>
                        </>
                      )}
                      <IconButton
                        sx={{ float: "right" }}
                        onClick={() => {
                          setActivePrice(tier)
                          setOpenDeleteModal(true)
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Titel"
                        name="title"
                        required
                        size="small"
                        variant="outlined"
                        value={tier?.title}
                        onChange={(e) => {
                          const newPrice = [...prices];
                          newPrice[index].title = e.target.value;
                          setPrices(newPrice);
                        }}
                        disabled={!edit[index]}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type={"number"}
                        label="Preis"
                        name="price"
                        required
                        size="small"
                        variant="outlined"
                        onChange={(e) => {
                          const newPrice = [...prices];
                          newPrice[index].amount = e.target.value;
                          setPrices(newPrice);
                        }}
                        value={tier.amount}
                        disabled={!edit[index]}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Beschreibung"
                        name="description"
                        required
                        multiline
                        size="small"
                        variant="outlined"
                        onChange={(e) => {
                          const newPrice = [...prices];
                          newPrice[index].description = e.target.value;
                          setPrices(newPrice);
                        }}
                        value={tier.description}
                        disabled={!edit[index]}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </form>
          </Grid>
        );
      })}
    </>
  );
}
