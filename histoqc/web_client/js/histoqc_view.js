import { getCurrentToken } from '@girder/core/auth';

function getHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    'Girder-Token': getCurrentToken()
  }
}

var histoqc_status_id = '#trigger-job-status'

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
      $('#trigger-job-button').hide()
      $(histoqc_status_id).text('HistoQC job ' + jobId + ' has started. Please wait...')
      $(histoqc_status_id).show()

      watchJob(jobId)

    }).catch( err => {
      console.log( 'Fetch Error :-S', err );
    });
}

function watchJob(jobId) {
  const checkSeconds = 2
  setInterval(function(){
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
          text = text + '<br/>' + logLine
        }
        $(histoqc_status_id).html(text)
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
  const buttonHTML = `
    <button id="trigger-job-button" onclick="triggerHistoQCJob()">Click here to run HistoQC on all images in this folder.</button>
    <p id="trigger-job-status">HistoQC status will go here.</p>
    <div id="parac-svg-container" />
  `
  widget.after(buttonHTML)
  $(histoqc_status_id).hide()
}