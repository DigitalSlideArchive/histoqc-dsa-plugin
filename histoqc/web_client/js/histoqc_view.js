import { restRequest, getApiRoot } from '@girder/core/rest'


const artifact_list = [
  "thumb_small",
  "thumb",
  "areathresh",
  "blurry",
  "bright",
  "coverslip_edge",
  "dark",
  "deconv_c0",
  "deconv_c1",
  "deconv_c2",
  "fatlike",
  "flat",
  "fuse",
  "hist",
  "mask_use",
  "pen_markings",
  "small_fill",
  "small_remove",
  "spur"
]
const histoqc_output_folder_name = 'histoqc_outputs'


function load_histoqc_subfolder(folder_id, table_id) {
  restRequest({
    method: 'GET',
    url: 'folder',
    data: {
      parentId: folder_id,
      parentType: 'folder',
      name: histoqc_output_folder_name
    }
  }).done(function (response) {
    const histoqc_output_folder_id = response[0]._id
    initialize_table(histoqc_output_folder_id, table_id)
    renderParallelData(histoqc_output_folder_id);
  });
}

const generateUUID = () => {
  // https://stackoverflow.com/a/8809472/130164
  let
    d = new Date().getTime(),
    d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
  });
};


function initialize_table(histoqc_output_folder_id, table_id) {
  restRequest({
    method: 'GET',
    url: 'folder',
    data: {
      parentId: histoqc_output_folder_id,
      parentType: 'folder'
    }
  }).done(function (response) {
    console.log('response = ', response)

    const cell_style = 'padding: 5px; border: 3px inset;'

    const table = document.getElementById(table_id)
    const header_row = document.createElement('tr')
    for (const artifact_name of ['filename'].concat(artifact_list)) {
      const cell = document.createElement('th')
      cell.innerHTML = artifact_name
      cell.style.cssText = cell_style
      header_row.appendChild(cell)
    }
    table.appendChild(header_row)

    let row_count = 0
    for (const histoqc_output_subfolder of response) {
      if (histoqc_output_subfolder.size === 0) continue
      console.log('histoqc_output_subfolder = ', histoqc_output_subfolder)
      const subfolder_name = histoqc_output_subfolder.name
      const subfolder_id = histoqc_output_subfolder._id

      const row = document.createElement('tr')
      let cell = document.createElement('td')
      cell.innerHTML = subfolder_name
      cell.style.cssText = cell_style
      row.appendChild(cell)

      for (const artifact_name of artifact_list) {
        const artifact_filename = subfolder_name + '_' + artifact_name + '.png'
        cell = document.createElement('td')
        cell.innerHTML = 'Loading ' + artifact_filename + ' ...'
        cell.style.cssText = cell_style
        cell.id = generateUUID()
        row.appendChild(cell)

        load_histoqc_output_cell(cell.id, subfolder_id, artifact_filename)
      }

      table.appendChild(row)

      row_count++
    }
  })
}


function load_histoqc_output_cell(cell_id, folder_id, output_name) {
  console.log('cell_id, folder_id = ', cell_id, folder_id, output_name)
  restRequest({
    method: 'GET',
    url: 'item',
    data: {
      folderId: folder_id,
      name: output_name,
      limit: 1
    }
  }).done(function (response) {
    const histoqc_output_item_id = response[0]._id
    restRequest({
      method: 'POST',
      url: 'item/' + histoqc_output_item_id + '/tiles',
      compression: 'webp',
      error: null
    }).always(() => {
      const thumbnail_url = getApiRoot() + '/item/' + histoqc_output_item_id + '/tiles/thumbnail'
      document.getElementById(cell_id).innerHTML = '<a target="_blank" href="#item/' + histoqc_output_item_id + '"><img src="' + thumbnail_url + '"></img></a>'
    })
  })
}

function triggerHistoQCJob(folder_id, div_id) {
  document.getElementById(div_id).innerHTML = '<p>Starting HistoQC job, please wait...</p>';

  restRequest({
    method: 'GET',
    url: 'folder',
    data: {
      parentId: folder_id,
      parentType: 'folder',
      name: histoqc_output_folder_name
    }
  }).then((response) => {
    if (response.length > 0) {
      return restRequest({
        method: 'DELETE',
        url: 'folder/' + response[0]._id
      });
    }
  }, () => {
    return Promise.resolve();
  }).then(() => {
    restRequest({
      method: 'POST',
      url: 'slicer_cli_web/thetatech_histoqc-dsa_latest/HistoQC/run',
      data: {
        inputDir: folder_id,
        girderApiUrl: "",
        girderToken: ""
      }
    }).done((response) => {
      const job_url = '#job/' + response._id
      document.getElementById(div_id).innerHTML = '<a target="_blank" href="' + job_url + '">HistoQC job submitted. Click here to view logs.</a>'
    });
  });
}



export function renderHistoQC(widget, folder_id) {
  console.log('folder_id = ', folder_id)

  window.triggerHistoQCJob = triggerHistoQCJob
  const afterHTML = `
    <div>
      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>

      <hr><hr>
      <h3>HistoQC</h3>
      <a href="https://github.com/choosehappy/HistoQC" target="_blank">View on Github</a>
      <br>
      <br>

      <div id="run-histoqc-job">
        <button id="histoqc-button">Click here to (re)run HistoQC on all images in this folder.</button>
      </div>
      <br>

      <div id="plotly-parallel">
      </div>
      <br>

      <div id="histoqc-table-div">
        <table id="histoqc_output_table"></table>
      </div>
      <br>
      <hr><hr>

    </div>
  `
  widget.after(afterHTML)
  document.getElementById('histoqc-button').addEventListener('click', () => {
    triggerHistoQCJob(folder_id, 'run-histoqc-job');
  })

  load_histoqc_subfolder(folder_id, 'histoqc_output_table')


}


// main.js
function renderParallelData(histoqc_output_folder_id) {
  restRequest({
    method: 'GET',
    url: 'item',
    data: {
      folderId: histoqc_output_folder_id,
      name: 'results.tsv',
      limit: 1
    }
  }).done(data => {
    if (!data || !data.length) {
      const tsv_id = data[0]._id
      restRequest({
        method: 'GET',
        url: 'item/' + tsv_id + '/download'
      }).done(tsv_data => {
        const { data, headers } = parseTsv(tsv_data);
        createParallelPlot(data, headers);
      });
    }
  });
}


function parseTsv(tsv_data) {
  const lines = tsv_data.split('\n');

  const header_row_index = lines.findIndex((line) => line.startsWith('#dataset:filename'));
  const headers = lines[header_row_index].split('\t');

  const data = [];
  for (let i = header_row_index + 1; i < lines.length - 1; i++) {
    const values = lines[i].split('\t');
    const dataObj = {};
    for (let j = 0; j < headers.length; j++) {
      dataObj[headers[j]] = isNaN(values[j]) ? values[j] : parseFloat(values[j]);
    }
    data.push(dataObj);
  }
  return { data, headers };
}


function createParallelPlot(data, headers) {

  const createDimension = (label) => ({
    label,
    values: data.map((d) => d[label]),
  });
  const dimensions = headers
    .map((header) => createDimension(header))
    .filter((dimension) => {
      return !dimension.values.some((value) => isNaN(value));
    });
  const plotData = [
    {
      type: 'parcoords',
      line: { color: 'blue' },
      dimensions: dimensions,
    },
  ];

  const fontSize = 10;
  const font = `${fontSize}px`;
  const maxLabelWidth = headers.reduce((maxWidth, header) => {
    const labelWidth = measureTextWidth(header, font);
    return Math.max(maxWidth, labelWidth);
  }, 0);
  const paddingBetweenLabels = 4;
  const totalWidth = (maxLabelWidth + paddingBetweenLabels) * (headers.length - 1);

  const layout = {
    title: 'HistoQC Parallel Plot',
    width: totalWidth,
  };
  Plotly.newPlot('plotly-parallel', plotData, layout);

}


function measureTextWidth(text, font) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}
