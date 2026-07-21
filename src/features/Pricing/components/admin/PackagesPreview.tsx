import { ReactElement } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography,
} from "@mui/material";

import { Package } from "../../../../utils/types";

type Props = {
  packages: Package[];
  setPackages: (packages: Package[]) => void;
  selectedPackages: Package[];
  setSelectedPackages: (packages: Package[]) => void;
};

export default function PackagesPreview(props: Props): ReactElement {
  const { packages } = props;

  return (
    <Container maxWidth="md" component="main">
      <Grid container spacing={5} alignItems="flex-end">
        {packages.sort((a: Package, b: Package) => a?.title.localeCompare(b?.title))
        .map((pkg: Package) => (
          // Enterprise card is full width at sm breakpoint
          <Grid
            item
            key={pkg?.title}
            xs={12}
            sm={pkg?.title === "Enterprise" ? 12 : 6}
            md={4}
          >
            <Card sx={{ marginBottom: "15px" }}>
              <CardHeader
                title={pkg?.title}
                subheader={`${pkg.totalPrice } €`}
                titleTypographyProps={{ align: "center" }}
                subheaderTypographyProps={{
                  align: "center",
                }}
                sx={{
                  backgroundColor: (theme) =>
                    theme.palette.mode === "light"
                      ? theme.palette.grey[200]
                      : theme.palette.grey[700],
                }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" color="text.primary">
                      {pkg.numberOfImages} Bilder sind in dem Paket enthalten <br />
                      Jedes weitere Bild kostet {pkg.singlePrice} €
                    </Typography>
                  </Grid>
                  {/* <Grid item xs={12}>
                    <Typography variant="h6" color="text.primary">
                      Gesamtpreis: <br/> TODO
                    </Typography>
                  </Grid> */}
                  {/* {selectedPackages && (
                    <Grid item xs={12}>
                      <Button
                        onClick={() => {
                          if (selectedPackages.map(x => x.id).includes(pkg.id)) {
                            setSelectedPackages(selectedPackages.filter(x => x.id !== pkg.id))
                          } else {
                            setSelectedPackages([...selectedPackages, pkg])
                          }
                        }}
                        variant={selectedPackages.map(x => x.id).includes(pkg.id) ? "contained" : "outlined"}
                        fullWidth
                      >
                        {selectedPackages.map(x => x.id).includes(pkg.id) ? "Ausgewählt" : "Auswählen"}
                      </Button>
                    </Grid>
                  )} */}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
