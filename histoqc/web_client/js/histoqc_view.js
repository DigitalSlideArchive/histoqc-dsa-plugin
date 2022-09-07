import { getCurrentToken } from '@girder/core/auth';

function getHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    'Girder-Token': getCurrentToken()
  }
}

var histoqc_status_id = '#histoqc-status'
var histoqc_table_id = '#histoqc-table-div'
var histoqc_button_id = "#histoqc-button"

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
          generateTable()
          $(histoqc_button_id).show()
        }
      });

  }, checkSeconds * 1000);     
}

function getFolderId() {
  const url = window.location.href
  const url_arr = url.split('/')
  const folder_id = url_arr[url_arr.length - 1]
  return folder_id
}


export function renderHistoQC(callingThis, widget) {

  const url = window.location.href
  const url_arr = url.split('/')
  if (url_arr[url_arr.length - 2] != 'folder') {
      console.log("URL ARR FAILURE ", url_arr)
      return;
  }

  window.triggerHistoQCJob = triggerHistoQCJob
  const afterHTML = `
    <div>

      <hr><hr>
      <h3>HistoQC</h3>
      <a href="https://github.com/choosehappy/HistoQC" target="_blank">Github Link</a>
      <br>
      <br>

      <button id="histoqc-button" onclick="triggerHistoQCJob()">Click here to (re)run HistoQC on all images in this folder.</button>
      <br>

      <textarea style="overflow:auto;" cols="100" rows="10" id="histoqc-status"></textarea>
      <br>

      <div id="histoqc-table-div">
        <p>Loading histoqc results...</p>
      </div>
      <br>
      <hr><hr>

    </div>
  `
  widget.after(afterHTML)
  $(histoqc_status_id).hide()
  generateTable()
}

function generateTable() {
  const url = getApiRoot() + '/folder/' + getFolderId() + '/histoqc'
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
    }).then( resp => {
      
      let tableHTML = "<h4>HistoQC Outputs</h4>"
      let any_rows = false

      let row1;
      for (const row of resp) {
        if (row['histoqc_outputs'].length > 0) {
          any_rows = true
          row1 = row;
          break;
        }
      }

      if (any_rows) {
        tableHTML += `
          <p>Click on any image.</p>
          <table>
        `

        row1['histoqc_outputs'].sort((a, b) => a.histoqcType < b.histoqcType ? 1 : -1)
        tableHTML += `<tr> <th> Source </th>`
        row1['histoqc_outputs'].forEach(column => {
          tableHTML += `<th> ${column.histoqcType} </th>`
        })
        tableHTML += `</tr>`
        resp.forEach(row => {
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

      $(histoqc_table_id).html(tableHTML)
      $(histoqc_table_id).show()
      
    });
}