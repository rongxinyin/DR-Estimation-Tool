import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  Grid,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCaseIDs, gtaCalculation } from "../logic/DRCalculations.js";
import { abbreviationToFullName } from "../logic/StateAbbreviations.js";
import { createVisualizations } from "./calculator-components/Visualizations.js";

export default function Basic() {
  let navigate = useNavigate(); // navigate to diff pages
  // dropdown forms
  const [buildingName, setBuildingName] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [floorArea, setFloorArea] = useState();
  const [floorHeight, setFloorHeight] = useState();
  const [state, setState] = useState("");
  const [hvacType, setHVACType] = useState("");
  const [CSSB, setCSSB] = useState([{}, {}, {}, {}]);
  const [precool, setPrecool] = useState();
  const [tempReset, setTempReset] = useState();
  const [peakDemand, setPeakDemand] = useState();
  const [zipcode, setZipcode] = useState("");
  const [pctFloorArea, setPctFloorArea] = useState();

  const [graphs, setGraphs] = useState([]);

  const chooseBuildingName = (event) => {
    setBuildingName(event.target.value);
  };

  const chooseBuildingType = (event) => {
    setBuildingType(event.target.value);
  };

  const chooseState = (event) => {
    setState(event.target.value);
  };

  const chooseHVACType = (event) => {
    setHVACType(event.target.value);
  };

  const inputPrecool = (event) => {
    setPrecool(event.target.value);
  };

  const inputTempReset = (event) => {
    setTempReset(event.target.value);
  };

  const inputPeakDemand = (event) => {
    setPeakDemand(event.target.value);
  };

  const inputFloorArea = (event) => {
    setFloorArea(event.target.value);
  };

  const inputFloorHeight = (event) => {
    setFloorHeight(event.target.value);
  };

  const inputZipcode = (event) => {
    setZipcode(event.target.value);
  };

  const inputPctFloorArea = (event) => {
    setPctFloorArea(event.target.value);
  };

  const inputCSSBData = (inputInfo, event) => {
    let CSSB_Type = inputInfo[0];
    let eventHour = inputInfo[1] - 1;

    let CSSB_Data = Number(event.target.value);

    let newCSSB = CSSB;
    let CSSB_Obj = newCSSB[eventHour];

    if (CSSB_Type == "OAT") {
      CSSB_Obj["avg_temp"] = CSSB_Data;
    } else {
      CSSB_Obj["avg_demand"] = CSSB_Data;
    }

    newCSSB[eventHour] = CSSB_Obj;
    setCSSB(newCSSB);
  };

  const checkIsValid = () => {
    //Function just checking for completeness for now. Will add range checks later.
    let inputValidity = "valid";

    //validate CSSB
    let CSSB_IsValid = true;
    for (var hour = 0; hour < 4; hour++) {
      if (
        !CSSB[hour].hasOwnProperty("avg_temp") ||
        !CSSB[hour].hasOwnProperty("avg_demand") ||
        !CSSB[hour].avg_temp ||
        !CSSB[hour].avg_demand
      ) {
        CSSB_IsValid = false;
      }
    }

    if (
      !buildingType ||
      !floorArea ||
      !peakDemand ||
      !state ||
      !precool ||
      !tempReset ||
      !CSSB_IsValid
    ) {
      inputValidity = "missing input";
    }

    return inputValidity;
  };

  const submitInputs = async () => {
    let inputValidity = checkIsValid();
    if (inputValidity == "valid") {
      //If inputs are valid
      setGraphs([]);
      //Generate caseID
      let buildingTypeSize = "";
      if (buildingType == "Office") {
        if (peakDemand < 200) {
          buildingTypeSize = "SmallOffice";
        } else if (peakDemand < 500) {
          buildingTypeSize = "MediumOffice";
        } else {
          buildingTypeSize = "LargeOffice";
        }
      } else {
        buildingTypeSize = buildingType;
      }
      let caseIDs = createCaseIDs(
        state,
        buildingTypeSize,
        2004,
        precool,
        tempReset
      );

      let fullStateName = abbreviationToFullName(state);

      //GTA calculations
      let DR_output = await gtaCalculation(fullStateName, caseIDs, CSSB);

      if (Object.keys(DR_output).length != 0) {
        //If data was found for these inputs

        //Update analytics
        const res = await axios.patch(
          `http://localhost:8080/analytics/requestUpdate/basic`
        );

        //Display the graphs
        let kW_Shed = [];
        let W_ft2 = [];
        let shedPercentage = [];

        let kW_sum = 0;
        let shedPercentageSum = 0;

        for (var hour = 1; hour <= 4; hour++) {
          let hourkW = DR_output[hour - 1].DR_KW;
          kW_sum += hourkW;
          kW_Shed.push(hourkW);

          let hourW_ft2 = (1000 * hourkW) / floorArea;
          W_ft2.push(hourW_ft2);

          let hourShedPercentage = DR_output[hour - 1].DR_PCT * 100;
          shedPercentage.push(hourShedPercentage);
          shedPercentageSum += hourShedPercentage;
        }

        //add average values to data
        let avg_kW_Shed = kW_sum / 4;
        kW_Shed.push(avg_kW_Shed);

        let avg_W_ft2 = (1000 * avg_kW_Shed) / floorArea;
        W_ft2.push(avg_W_ft2);

        shedPercentage.push(shedPercentageSum / 4);

        //kW shed per hour
        setGraphs((prev) => [
          ...prev,
          createVisualizations(
            [1, 2, 3, 4, "Average"],
            "Estimated Kilowatt Shed per Hour",
            "Hours",
            "Power (kW)",
            kW_Shed,
            graphs.length,
            275,
            ["#f5ca0a", "#f5ca0a", "#f5ca0a", "#f5ca0a", "#05a129"]
          ),
        ]);

        //Watt shed per sq. ft. per hour
        setGraphs((prev) => [
          ...prev,
          createVisualizations(
            [1, 2, 3, 4, "Average"],
            "Estimated Watt Shed per Square Foot per Hour",
            "Hours",
            "Power Density (W/ft²)",
            W_ft2,
            graphs.length,
            275,
            ["#f5ca0a", "#f5ca0a", "#f5ca0a", "#f5ca0a", "#05a129"]
          ),
        ]);

        //kW percent shed per hour
        setGraphs((prev) => [
          ...prev,
          createVisualizations(
            [1, 2, 3, 4, "Average"],
            "Estimated Kilowatt Percent Shed per Hour",
            "Hours",
            "Percentage Shed",
            shedPercentage,
            graphs.length,
            275,
            ["#f5ca0a", "#f5ca0a", "#f5ca0a", "#f5ca0a", "#05a129"]
          ),
        ]);
      } else {
        //Data was not found for this set of inputs (this CaseID)
        alert(
          "Estimates could not be made with these inputs. Please try again."
        );
      }
    } else if (inputValidity == "missing input") {
      //Inputs are incomplete
      alert("Please enter all the required inputs.");
    }
  };

  const textFieldVariant = "outlined";

  const textFieldInputPropsSX = {
    sx: {
      color: "#FFFFFF",
    },
  };

  const textFieldSX = {
    width: "100%",
    marginBottom: 1,
    marginTop: 1,
    border: "2px solid #F0F0F0",
    backgroundColor: "secondary.main",
    borderRadius: "10px",
  };

  const formControlSX = {
    width: "90%",
    marginBottom: 1,
  };

  // JSON Object with template data
  const templateBasicData = {
    buildingName: "Example",
    buildingType: "Office",
    floorArea: 10000,
    floorHeight: 12,
    hvacType: "Package RTU",
    peakDemand: 100,
    zipcode: 94720,
    state: "CA",
    pctFloorArea: 100,
    precool: -2,
    tempReset: 4,
    // Add other fields as necessary
  };

  // Function to load template data into form fields
  const loadBasicTemplate = () => {
    // Example: Set state for each field
    setBuildingName(templateBasicData.buildingName);
    setBuildingType(templateBasicData.buildingType);
    setFloorArea(templateBasicData.floorArea);
    setFloorHeight(templateBasicData.floorHeight);
    setHVACType(templateBasicData.hvacType);
    setPeakDemand(templateBasicData.peakDemand);
    setZipcode(templateBasicData.zipcode);
    setState(templateBasicData.state);
    setPctFloorArea(templateBasicData.pctFloorArea);
    setPrecool(templateBasicData.precool);
    setTempReset(templateBasicData.tempReset);
    // Repeat for other fields
  };

  return (
    <Grid container spacing={0} width="100%" height="100%" marginTop={1}>
      <Grid
        item
        md={6}
        xs={12}
        container
        direction="column"
        alignItems="left"
        justifyContent="center"
        bgcolor="primary.main"
        width={1}
        padding={4}
      >
        <ButtonGroup
          disableElevation
          variant="contained"
          aria-label="Disabled elevation buttons"
          color="secondary"
          sx={{ marginTop: 2 }}
        >
          <Button onClick={() => navigate("/basic")}>Basic</Button>
          <Button onClick={() => navigate("/advanced")}>Advanced</Button>
        </ButtonGroup>

        <Typography
          variant="h4"
          color="white.main"
          sx={{ fontWeight: "bold", m: 1, marginTop: 4 }}
        >
          Basic Calculator
        </Typography>

        <form>
          <Typography
            variant="h5"
            color="white.main"
            sx={{ fontWeight: "bold", m: 1 }}
          >
            Basic Inputs
          </Typography>

          <Grid container spacing={0}>
            <Grid item xs={6}>
              <FormControl sx={formControlSX}>
                <Typography
                  variant="body2"
                  color="white.main"
                  sx={{ fontWeight: "bold", marginLeft: 1 }}
                >
                  Building Name
                </Typography>
                <TextField
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
              </FormControl>
              <FormControl sx={formControlSX}>
                <Typography
                  variant="body2"
                  color="white.main"
                  sx={{ fontWeight: "bold", marginLeft: 1 }}
                >
                  Floor Area (ft²)
                </Typography>
                <TextField
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  type="number"
                  value={floorArea}
                  onChange={(e) => setFloorArea(e.target.value)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
              </FormControl>
              <FormControl sx={formControlSX}>
                <Typography
                  variant="body2"
                  color="white.main"
                  sx={{ fontWeight: "bold", marginLeft: 1 }}
                >
                  HVAC Type
                </Typography>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={hvacType}
                  onChange={chooseHVACType}
                  color="secondary"
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                >
                  <MenuItem value={"Package RTU"}>Package RTU</MenuItem>
                  <MenuItem value={"Package RTU + VAV"}>
                    Package RTU + VAV
                  </MenuItem>
                  <MenuItem value={"Chiller + VAV"}>Chiller + VAV</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={formControlSX}>
                <Typography
                  variant="body2"
                  color="white.main"
                  sx={{ fontWeight: "bold", marginLeft: 1 }}
                >
                  Zipcode
                </Typography>
                <TextField
                  id="outlined-basic"
                  variant={textFieldVariant}
                  type="number"
                  autoComplete="off"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl sx={formControlSX}>
                <Typography
                  variant="body2"
                  color="white.main"
                  sx={{ fontWeight: "bold", marginLeft: 1 }}
                >
                  Building Type
                </Typography>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={buildingType}
                  onChange={chooseBuildingType}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                >
                  <MenuItem value={"Office"}>Office</MenuItem>
                  <MenuItem value={"Retail"}>Retail</MenuItem>
                  <MenuItem value={"School"}>School</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={formControlSX}>
                <Typography
                  variant="body2"
                  color="white.main"
                  sx={{ fontWeight: "bold", marginLeft: 1 }}
                >
                  Floor Height (ft)
                </Typography>
                <TextField
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  type="number"
                  value={floorHeight}
                  onChange={(e) => setFloorHeight(e.target.value)}
                  sx={textFieldSX}
                  inputProps={{
                    ...textFieldInputPropsSX,
                    min: 1, // Set the minimum value to 0
                  }}
                />
              </FormControl>
              <FormControl sx={formControlSX}>
                <Typography
                  variant="body2"
                  color="white.main"
                  sx={{ fontWeight: "bold", marginLeft: 1 }}
                >
                  Summer Peak Demand (kW)
                </Typography>
                <TextField
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  value={peakDemand}
                  onChange={(e) => setPeakDemand(e.target.value)}
                  type="number"
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
              </FormControl>
              <Typography
                variant="body2"
                color="white.main"
                sx={{ fontWeight: "bold", marginLeft: 1, marginTop: 0 }}
              >
                State
              </Typography>
              <FormControl sx={formControlSX}>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={state}
                  onChange={chooseState}
                  color="secondary"
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                >
                  <MenuItem value={"CA"}>California</MenuItem>
                  <MenuItem value={"MA"}>Massachusetts</MenuItem>
                  <MenuItem value={"NY"}>New York</MenuItem>
                  <MenuItem value={"TX"}>Texas</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography
            variant="h5"
            color="white.main"
            sx={{ fontWeight: "bold", m: 1, marginTop: 3 }}
          >
            Demand Shed Capacity Calculation
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography
                variant="body2"
                color="white.main"
                sx={{ fontWeight: "bold", marginLeft: 1, marginTop: 1 }}
              >
                Percentage of Building Floor Area that GTA will Apply (0-100)
              </Typography>
              <TextField
                id="outlined-basic"
                variant={textFieldVariant}
                autoComplete="off"
                value={pctFloorArea}
                type="number"
                onChange={inputPctFloorArea}
                sx={textFieldSX}
                inputProps={textFieldInputPropsSX}
              />
            </Grid>
            <Grid item xs={6}>
              <Paper></Paper>
            </Grid>
            <Grid item xs={6}>
              <Typography
                variant="body2"
                color="white.main"
                sx={{ fontWeight: "bold", marginLeft: 1, marginTop: 1 }}
              >
                Precooling Period Temp Offset (°F)
              </Typography>
              <TextField
                id="outlined-basic"
                variant={textFieldVariant}
                autoComplete="off"
                value={precool}
                onChange={inputPrecool}
                sx={textFieldSX}
                inputProps={textFieldInputPropsSX}
                type="number"
              />
            </Grid>
            <Grid item xs={6}>
              {/* <TextField
                id="outlined-basic"
                variant={textFieldVariant}
                autoComplete="off"
                type="number"
                sx={textFieldSX}
                inputProps={textFieldInputPropsSX}
              /> */}

              <Typography
                variant="body2"
                color="white.main"
                sx={{ fontWeight: "bold", marginLeft: 1, marginTop: 1 }}
              >
                DR Event Period Temp Offset (°F)
              </Typography>
              <TextField
                id="outlined-basic"
                variant={textFieldVariant}
                autoComplete="off"
                value={tempReset}
                onChange={inputTempReset}
                type="number"
                sx={textFieldSX}
                inputProps={textFieldInputPropsSX}
              />
            </Grid>
          </Grid>

          <Box sx={{ flexDirection: "row" }}>
            <Typography
              variant="h5"
              color="white.main"
              sx={{ fontWeight: "bold", m: 1, marginTop: 3 }}
            >
              OAT and kW During the DR Event Hours
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <br></br>
                <Typography
                  variant="h6"
                  color="white.main"
                  sx={{
                    fontWeight: "bold",
                    m: 1,
                    marginTop: 6,
                    marginBottom: 2,
                  }}
                >
                  Hour 1
                </Typography>
                <Typography
                  variant="h6"
                  color="white.main"
                  sx={{
                    fontWeight: "bold",
                    m: 1,
                    marginTop: 5,
                    marginBottom: 2,
                  }}
                >
                  Hour 2
                </Typography>
                <Typography
                  variant="h6"
                  color="white.main"
                  sx={{
                    fontWeight: "bold",
                    m: 1,
                    marginTop: 6,
                    marginBottom: 2,
                  }}
                >
                  Hour 3
                </Typography>
                <Typography
                  variant="h6"
                  color="white.main"
                  sx={{
                    fontWeight: "bold",
                    m: 1,
                    marginTop: 6,
                    marginBottom: 2,
                  }}
                >
                  Hour 4
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography
                  variant="h6"
                  color="white.main"
                  sx={{ fontWeight: "bold", m: 1 }}
                >
                  OAT (°F)
                </Typography>
                <TextField
                  type="number"
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  onChange={(event) => inputCSSBData(["OAT", 1], event)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
                <TextField
                  type="number"
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  onChange={(event) => inputCSSBData(["OAT", 2], event)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
                <TextField
                  type="number"
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  onChange={(event) => inputCSSBData(["OAT", 3], event)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
                <TextField
                  type="number"
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  onChange={(event) => inputCSSBData(["OAT", 4], event)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
              </Grid>
              <Grid item xs={4}>
                <Typography
                  variant="h6"
                  color="white.main"
                  sx={{ fontWeight: "bold", m: 1 }}
                >
                  Meter kW
                </Typography>
                <TextField
                  type="number"
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  onChange={(event) => inputCSSBData(["Demand", 1], event)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
                <TextField
                  type="number"
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  onChange={(event) => inputCSSBData(["Demand", 2], event)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
                <TextField
                  type="number"
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  onChange={(event) => inputCSSBData(["Demand", 3], event)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
                <TextField
                  type="number"
                  id="outlined-basic"
                  variant={textFieldVariant}
                  autoComplete="off"
                  onChange={(event) => inputCSSBData(["Demand", 4], event)}
                  sx={textFieldSX}
                  inputProps={textFieldInputPropsSX}
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              color="secondary"
              onClick={submitInputs}
              sx={{
                marginTop: 2,
                marginBottom: 3,
                width: "25%",
                height: "50px",
              }}
            >
              Calculate
            </Button>
          </Box>
        </form>
      </Grid>
      <Grid
        item
        md={6}
        xs={12}
        container
        direction="column"
        alignItems="center"
        justifyContent="flex-start"
        bgcolor="#BED7DD"
        width={1}
        padding={2}
        paddingLeft={4}
      >
        <Typography
          variant="h4"
          color="primary.main"
          sx={{ fontWeight: "bold", m: 1, marginTop: 4 }}
        >
          Visualizations
        </Typography>
        {graphs}
      </Grid>
    </Grid>
  );
}
