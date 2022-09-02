export function renderHistoQC(render, widget) {

    const url = window.location.href
    const url_arr = url.split('/')
    if (url_arr[url_arr.length - 2] != 'folder') {
        console.log("URL ARR FAILURE ", url_arr)
        return;
    }

    const folder_id = url_arr[url_arr.length - 1]

    console.log("FOLDER FOLDER FOLDER ID IS ", folder_id)

    const buttonHTML = `
      <button>Click here to run HistoQC on all images in this folder.</button>
      <div id="parac-svg-container" />
    `
    widget.after(buttonHTML)
}