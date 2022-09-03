import { getCurrentToken } from '@girder/core/auth';

export function triggerHistoQCJob() {

  const apiRoot = window.location.origin + '/api/v1'
  console.log('apiRoot ', apiRoot)
  const triggerJobUrl = apiRoot + '/folder/' + getFolderId() + '/histoqc'
  console.log('triggerJobUrl', triggerJobUrl)
  
  const postDetails = {
    method: 'post',
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      'Girder-Token': getCurrentToken()
    },
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
      $('#trigger-job-status').text('HistoQC job ' + jobId + ' has started. Please wait...')
      $('#trigger-job-status').show()

    }).catch( err => {
      console.log( 'Fetch Error :-S', err );
    });
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
    <p id="trigger-job-status">Job running.</p>
    <div id="parac-svg-container" />
  `
  widget.after(buttonHTML)
  $('#trigger-job-status').hide()
}