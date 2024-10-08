import { Box, Typography } from "@mui/material";
import "chart.js/auto";
import { Bar } from "react-chartjs-2";

const BarChart = (props) => {
  let labels = props.labels;
  let chartTitle = props.chartTitle;
  let barColors = props.barColors;
  let data = {
    labels: labels,
    datasets: [
      {
        label: "Estimated Shed Results",
        backgroundColor: barColors,
        data: props.data,
      },
    ],
  };
  let options = {
    scales: {
      x: {
        title: {
          display: true,
          text: props.xAxisLabel,
          font: {
            size: 18,
          },
        },
      },
      y: {
        title: {
          display: true,
          text: props.yAxisLabel,
          font: {
            size: 18,
          },
        },
      },
    },
  };
  return (
    <div>
      <Bar data={data} options={options} />
    </div>
  );
};

const createVisualizations = (
  chartLabels,
  chartTitle,
  xAxisLabel,
  yAxisLabel,
  data,
  key,
  barHeight,
  barColors
) => {
  return (
    <div key={key}>
      <Typography
        variant="h5"
        color="primary.main"
        sx={{ fontWeight: "bold", m: 1 }}
      >
        {chartTitle}
      </Typography>
      <Box
        sx={{
          width: 525,
          height: barHeight,
          backgroundColor: "white.main",
          boxShadow: 3,
          borderRadius: "8px",
          "&:hover": {
            backgroundColor: "white.main",
            opacity: [0.9, 0.8, 0.7],
          },
          marginTop: 3,
          marginBottom: 3,
          paddingRight: 5,
          paddingTop: 2,
        }}
      >
        <BarChart
          labels={chartLabels}
          data={data}
          xAxisLabel={xAxisLabel}
          yAxisLabel={yAxisLabel}
          barColors={barColors}
        />
      </Box>{" "}
    </div>
  );
};

export { BarChart, createVisualizations };
