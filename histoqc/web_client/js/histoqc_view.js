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


function load_histoqc_subfolder(folder_id, table_id) {
  restRequest({
    method: 'GET',
    url: 'folder',
    data: {
      parentId: folder_id,
      parentType: 'folder',
      name: 'histoqc_outputs'
    }
  }).done(function (response) {
    console.log('response = ', response)
    const histoqc_output_folder_id = response[0]._id
    console.log('histoqc_output_folder_id = ', histoqc_output_folder_id)
    initialize_table(histoqc_output_folder_id, table_id)
  })
}


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
        cell.id = crypto.randomUUID()
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
      document.getElementById(cell_id).innerHTML = '<img src="' + thumbnail_url + '"></img>'
    })
  })
}


function triggerHistoQCJob(folder_id, div_id) {
  document.getElementById(div_id).innerHTML = '<p>Starting HistoQC job, please wait...</p>'

  restRequest({
    method: 'POST',
    url: 'slicer_cli_web/histoqc_latest/HistoQC/run',
    data: {
      inputDir: folder_id,
    }
  }).done(function (response) {
    const job_id = response._id
    const job_url = '#job/' + job_id
    console.log('job_url = ', job_url)
    document.getElementById(div_id).innerHTML = '<a target="_blank" href="' + job_url + '">HistoQC job submitted. Click here to view logs.</a>'
  })
}


export function renderHistoQC(widget, folder_id) {
  console.log('folder_id = ', folder_id)
  
  window.triggerHistoQCJob = triggerHistoQCJob
  const afterHTML = `
    <div>

      <hr><hr>
      <h3>HistoQC</h3>
      <a href="https://github.com/choosehappy/HistoQC" target="_blank">View on Github</a>
      <br>
      <br>

      <div id="run-histoqc-job">
        <button id="histoqc-button">Click here to (re)run HistoQC on all images in this folder.</button>
      </div>
      <br>

      <div id="histoqc-parallel-div">
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


function generateHistoQCParallelPlot(results_tsv) {
  // let html = '<h4>Parallel Plot For All Images In Folder</h4>'
  // html += '<textarea style="overflow:auto;" cols="100" rows="10" id="histoqc-parallel">'
  // html += results_tsv
  // html += '</textarea>'
  // html += '<br><p>(Under construction)</p></br>'

  // const parsed = parseParallelData(results_tsv)

  // const parallel_div = $(histoqc_parallel_id)
  // parallel_div.empty();

  // const parac_width = parallel_div.width()
  // const parac_height = parallel_div.height()
  // console.log('parac_width', parac_width)
  // console.log('parac_height', parac_height)

  // const PARAC_SVG = d3.select(histoqc_parallel_id).append("svg")
  //   .attr("id", "parac-svg")
  //   .attr("width", parac_width)
  //   .attr("height", parac_height)
  //   .append("g")
  // console.log('PARAC_SVG', PARAC_SVG)

  // const xScale = d3.scale.ordinal().rangePoints([0, parac_width], 1),
  //     yScale = {},
  //     dragging = {};

  // const line = d3.svg.line().interpolate('linear')
  // const axis = d3.svg.axis().ticks(5).orient("right")

  // // build feature list
  // const ORIGINAL_FEATURE_LIST = Object.keys(parsed[0]);
  // // update current selection
  // const ORIGINAL_CASE_LIST = parsed.map(function (d) {
  //   return d["filename"];
  // });
  // const PARA_COOR_SELECTED = ORIGINAL_CASE_LIST;
  // const CURRENT_PARALLEL_ATTRIBUTES = ORIGINAL_FEATURE_LIST.filter(function(d) {
  //   // in DEFAULT_PARAC_ATTRIBUTES and is numeric
  //   if (typeof(parsed[0][d]) == "number" && 
  //     DEFAULT_PARAC_ATTRIBUTES.indexOf(d) != -1) {
  //     return true;
  //   }
  //   return false;
  // });
  // console.log('CURRENT_PARALLEL_ATTRIBUTES', CURRENT_PARALLEL_ATTRIBUTES)

  // const data = parsed.map(function (d) {
  //   const attr_value_dict = {
  //     case_name: d["filename"],
  //     gid: d["groupid"]
  //   };
  //   for (var i = 0; i < CURRENT_PARALLEL_ATTRIBUTES.length; i++) {
  //     attr_value_dict[CURRENT_PARALLEL_ATTRIBUTES[i]] = 
  //     d[CURRENT_PARALLEL_ATTRIBUTES[i]];
  //   }
  //   return attr_value_dict;
  // });
  // console.log('data', data)

  // const selected_cases = dataset.map(function (d) {return d["filename"];});

  return ''
}

function parseParallelData(results_tsv) {

  const dataset_text = results_tsv.split(/#dataset:\s?/)[1];  

  const parsed = d3.tsv.parse(dataset_text, function (d) {
    if (d.hasOwnProperty("")) delete d[""];
    for (var key in d) {
      if ($.isNumeric(d[key])) {
        d[key] = +d[key];
      }
    }
    // add placeholder for cohortfinder results
    if (!d.hasOwnProperty("embed_x")) d["embed_x"] = null;
    if (!d.hasOwnProperty("embed_y")) d["embed_y"] = null;
    // non-negative integers in cohortfinder results
    if (!d.hasOwnProperty("groupid")) d["groupid"] = -1;
    // 0 or 1 in cohortfinder results
    if (!d.hasOwnProperty("testind")) d["testind"] = 2;
    if (!d.hasOwnProperty("sitecol")) d["sitecol"] = "None";
    if (!d.hasOwnProperty("labelcol")) d["labelcol"] = "None";
    return d;
  });
  console.log(parsed)
  
  return parsed
}

