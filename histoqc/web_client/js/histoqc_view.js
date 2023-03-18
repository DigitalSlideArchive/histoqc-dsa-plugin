import { getCurrentToken } from '@girder/core/auth'
import { restRequest } from '@girder/core/rest'


function getHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    'Girder-Token': getCurrentToken()
  }
}


function load_histoqc_subfolder(folder_id) {
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
    initialize_table(histoqc_output_folder_id)
  })
}


function initialize_table(histoqc_output_folder_id) {
  restRequest({
    method: 'GET',
    url: 'folder',
    data: {
      parentId: histoqc_output_folder_id,
      parentType: 'folder'
    }
  }).done(function (response) {
    console.log('response = ', response)
  })
}


var histoqc_status_id = '#histoqc-status'
var histoqc_table_id = '#histoqc-table-div'
var histoqc_button_id = "#histoqc-button"
var histoqc_parallel_id = "#histoqc-parallel-div"


// the /api/v1 can be gotten from some girder javascript call
function getApiRoot() { return window.location.origin + '/api/v1'}

export function triggerHistoQCJob() {

  const apiRoot = getApiRoot()
  const triggerJobUrl = apiRoot + '/folder/' + getFolderId() + '/histoqc'
  console.log('triggerJobUrl', triggerJobUrl)
  
  const postDetails = {
    method: 'post',
    headers: getHeaders(),
    mode: "cors"
  }

  fetch(triggerJobUrl, postDetails)
    .then( response => {
      if ( response.status !== 200 ) {
        console.log('Looks like there was a problem. Status Code: ' + response.status);
        return;
      }
      console.log( response.headers.get("Content-Type"));
      return response.json();
    }).then( myJson => {
      console.log(JSON.stringify(myJson));

      const jobId = myJson['_id']
      $(histoqc_button_id).hide()
      $(histoqc_status_id).text('HistoQC job ' + jobId + ' has started. Please wait...')
      $(histoqc_status_id).show()
      $(histoqc_table_id).hide()

      watchJob(jobId)

    }).catch( err => {
      console.log( 'Fetch Error :-S', err );
    });
}

function watchJob(jobId) {
  const checkSeconds = 2
  var logTimer = setInterval(function(){
    const url = getApiRoot() + '/job/' + jobId

    const details = {
      method: 'get',
      headers: getHeaders(),
      mode: "cors"
    }

    fetch(url, details)
      .then( response => {
        if ( response.status !== 200 ) {
          console.log('Looks like there was a problem. Status Code: ' + response.status);
          return;
        }
        console.log( response.headers.get("Content-Type"));
        return response.json();
      }).then( myJson => {
        console.log(JSON.stringify(myJson));
        const log = myJson['log']
        let text = ''
        for (const logLine of log) {
          const newline = '&#13;&#10;' // https://stackoverflow.com/a/8627926
          text = text + newline.repeat(2) + logLine 
        }
        if (log.length > 0) {
          $(histoqc_status_id).html(text)
        }
        $(histoqc_status_id).scrollTop($(histoqc_status_id)[0].scrollHeight) // https://stackoverflow.com/a/9170709

        const status = myJson['status']
        if (status > 2) {
          clearInterval(logTimer);
          //$(histoqc_status_id).hide()
          $(histoqc_table_id).show()
          generateHistoQCTable()
          $(histoqc_button_id).show()
        }
      });

  }, checkSeconds * 1000);     
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

      <button id="histoqc-button" onclick="triggerHistoQCJob()">Click here to (re)run HistoQC on all images in this folder.</button>
      <br>

      <textarea style="overflow:auto;" cols="100" rows="10" id="histoqc-status"></textarea>
      <br>

      <div id="histoqc-parallel-div">
      </div>
      <br>

      <div id="histoqc-table-div">
        <p>Loading histoqc results...</p>
      </div>
      <br>
      <hr><hr>

    </div>
  `
  widget.after(afterHTML)
  load_histoqc_subfolder(folder_id)
  //generateHistoQCOutputs()
}


function generateHistoQCOutputs(folder_id) {

  const url = getApiRoot() + '/folder/' + folder_id + '/histoqc'
  const details = {
    method: 'get',
    headers: getHeaders(),
    mode: "cors"
  }
  fetch(url, details)
    .then( response => {
      if ( response.status !== 200 ) {
        console.log('Looks like there was a problem. Status Code: ' + response.status);
        return;
      }
      console.log( response.headers.get("Content-Type"));
      return response.json();
    }).then( histoqc_response => {
      
      const grouped_histoqc_output = histoqc_response['grouped']
      const grouped_url = getApiRoot() + '/item/' + grouped_histoqc_output['_id'] + '/download'
      //console.log(grouped_url)

      fetch(grouped_url, details)
      .then( grouped_response => {
        if ( grouped_response.status !== 200 ) {
          console.log('Looks like there was a problem. Status Code: ' + response.status);
          return;
        }
        //console.log(grouped_response)
        return grouped_response.text();
      }).then(results_tsv => {

        console.log(results_tsv)

        const parallelHTML = generateHistoQCParallelPlot(results_tsv)
        const tableHTML = generateHistoQCTable(histoqc_response['individual'])

        $(histoqc_table_id).html(tableHTML)
        $(histoqc_table_id).show()
        
      })
    })
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

function generateHistoQCTable(histoqc_outputs) {

  let tableHTML = ""
  let any_rows = false

  let row1;
  for (const row of histoqc_outputs) {
    if (row['histoqc_outputs'].length > 0) {
      any_rows = true
      row1 = row;
      break;
    }
  }

  if (any_rows) {

    tableHTML = "<h4>HistoQC Individual Outputs</h4><table>"

    row1['histoqc_outputs'].sort((a, b) => a.histoqcType < b.histoqcType ? 1 : -1)
    tableHTML += `<tr> <th> Source </th>`
    row1['histoqc_outputs'].forEach(column => {
      tableHTML += `<th> ${column.histoqcType} </th>`
    })
    tableHTML += `</tr>`
    histoqc_outputs.forEach(row => {
      if (row['histoqc_outputs'].length > 0) {
          tableHTML += '<tr>'
          tableHTML += `
                  <td>
                      ${row['source_image'].name}
                  </td>
          `
        row['histoqc_outputs'].sort((a, b) => a.histoqcType < b.histoqcType ? 1 : -1)
        row["histoqc_outputs"].forEach(column => {
          tableHTML += `<td style="padding:5px;"> 
                  <a href="/#item/${column._id}">
                  <img src="/api/v1/item/${column._id}/tiles/thumbnail"/>
                  </a>
              </td>`
        })
        tableHTML += '</tr>'
      }
    })
    tableHTML += '</table>'
  } else {
    tableHTML += "<p>No HistoQC outputs detected. Please rerun it.</p>"
  }

  return tableHTML

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


var DEFAULT_PARAC_ATTRIBUTES = [
  "levels", 
  "height", 
  "width", 
  "mpp_x", 
  "mpp_y", 
  "Magnification", 
  "pen_markings", 
  "coverslip_edge", 
  "bubble", 
  "nonwhite", 
  "dark", 
  "percent_small_tissue_removed", 
  "percent_small_tissue_filled", 
  "percent_blurry", 
  "spur_pixels", 
  "template1_MSE_hist", 
  "template2_MSE_hist", 
  "template3_MSE_hist", 
  "template4_MSE_hist", 
  "michelson_contrast", 
  "rms_contrast", 
  "grayscale_brightness", 
  "chan1_brightness", 
  "chan2_brightness", 
  "chan3_brightness", 
  "deconv_c0_mean", 
  "deconv_c1_mean", 
  "deconv_c2_mean", 
  "chuv1_brightness_YUV",
  "chuv2_brightness_YUV",
  "chuv3_brightness_YUV",
  "chan1_brightness_YUV",
  "chan2_brightness_YUV",
  "chan3_brightness_YUV",
  "pixels_to_use"
];