const videoWrapper = document.getElementById("videoWrapper");
const videoContainer = document.getElementById("videoContainer");
const fileInput = document.getElementById("fileInput");
const transcriptWrapper = document.getElementById("transcriptWrapper");
 
let subtitles = [];
let autoScrollDisabled = false;

// Handle subtitle file upload
fileInput.addEventListener('change', function(event) {
   let video = document.getElementById("video");
    if(video!==null){
        video.remove();
    }

    // Create video element
    video = document.createElement('video');
    video.controls = true;
    video.id="video";
    // Create track element for subtitles
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'English';
    track.srclang = 'en';
    track.default = true;
    video.appendChild(track);
 
    // Append video element to the container
    videoContainer.appendChild(video);

    const label = document.createElement("label");
    label.innerHTML="Font size:"
    const selectElement = document.createElement("select");
    const option_10 = document.createElement("option");
    const option_20 = document.createElement("option");
    const option_30 = document.createElement("option");
    option_10.innerHTML="10px";
    option_10.value=10;
    option_20.innerHTML="20px";
    option_20.value=20;
    option_20.selected=true;
    option_30.innerHTML="30px";
    option_30.value=30;
    
    selectElement.appendChild(option_10);
    selectElement.appendChild(option_20);
    selectElement.appendChild(option_30);
    videoWrapper.appendChild(label);
    videoWrapper.append(selectElement);

    selectElement.addEventListener('change', function(event) {
        setFontSizeFn(event.target.value);
    })

    const file = event.target.files[0];
    fetch("asset/" + file.name.split(".")[0] + "/captions.srt").then(rsp =>{
        if (!rsp.ok) {
            throw new Error('Network response was not ok');
        }
        return rsp.text();
    }).then(data => {
        subtitles = [];
        subtitles = parseSRT(data);
        const webVTTContent = convertToWebVTT(subtitles);
        const blob = new Blob([webVTTContent], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        track.src = url;
        loadTranscript(subtitles);
    })
    .catch(error => {
        console.error('Error fetching the file:', error?.message);
    });

    video.src = "./asset/" + file.name.split(".")[0] + "/" + file.name;

    let matchingTranscript=null;
    let lastMatchingTranscript=null;
    video.addEventListener('timeupdate', function() {
        const currentTime = video.currentTime;
        for (let i = subtitles.length - 1; i >= 0; i--) {
            const item = subtitles[i];
            if ((timeStringToSeconds(item.start) - currentTime) < 0.25) {
                matchingTranscript = item;
                break;
            }
        }

        if(matchingTranscript!==lastMatchingTranscript&&lastMatchingTranscript!==null){
            const row = document.getElementById(timeStringToSeconds(lastMatchingTranscript.start))
            row.style.background = "#f4f4f4";
        }

        if(matchingTranscript!==null){
            const row = document.getElementById(timeStringToSeconds(matchingTranscript.start))
            row.style.background = "#CBC3E3";
            if(!autoScrollDisabled){
                row.scrollIntoView({ behavior: 'smooth' , block: 'center'});
            }
            lastMatchingTranscript = matchingTranscript;
        }
    });
});
 
// Parse SRT file content
function parseSRT(data) {
    const regex = /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/;
      const result = [];
      const dataArr = data.split("\n");
      let match;
      for(let i=0; i<data.length; i++){
         if((match=regex.exec(dataArr[i]))!==null){
            result.push({
               index: parseInt(dataArr[i-1]),
               start: match[1].replace(',', '.'),
               end: match[2].replace(',', '.'),
               text: dataArr[i+1]
           });
         }
      }
      return result;
}

function loadTranscript(subtitles){
    let table = document.getElementById("transcriptTable");
    if(table!==null){
        table.remove();
    }
    table = document.createElement("table");
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent="Transcript";
    headerRow.appendChild(th);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.id="transcriptTable"
    transcriptWrapper.append(table);
    thead.style.position="sticky";
    thead.style.top=0;
    thead.style.zIndex=1;
    thead.style.background="#f2f2f2";
    thead.style.cursor="pointer";
    headerRow.style.textAlign="left";

    const tbody = document.createElement('tbody');
    subtitles.forEach(sub => {
        const row = document.createElement('tr');
        row.onclick=revindVideoFn;
        row.id = timeStringToSeconds(sub.start);
        row.style.background="#f4f4f4";
        row.style.cursor="pointer";
        const rowTd = document.createElement('td');
        rowTd.textContent = sub.start.split(".")[0] + "  " + sub.text;
        row.appendChild(rowTd);
        tbody.appendChild(row);
    })
    table.appendChild(tbody);

    thead.addEventListener("click", function(){
        autoScrollDisabled = !autoScrollDisabled;
        if(!autoScrollDisabled){
            transcriptWrapper.style.background="#ccc";
        }else{
            transcriptWrapper.style.background="#ADD8E6";
        }
    })
}

function timeStringToSeconds(timeString) {
    const parts = timeString.split(':');
    const secondsParts = parts[2].split('.');
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(secondsParts[0], 10) + parseInt(secondsParts[1], 10) / 1000;
}

// Convert SRT data to WebVTT format
function convertToWebVTT(subtitles) {
    let webVTT = "WEBVTT\n\n";
    subtitles.forEach(sub => {
        webVTT += `${sub.start} --> ${sub.end}\n${sub.text}\n\n`;
    });
    return webVTT;
}

function revindVideoFn(e){
    const text = e.target.innerHTML;
    const [searchedItem] = subtitles.filter(item => item.text===text.split("  ")[1]);
    video.currentTime = timeStringToSeconds(searchedItem.start);
}

function setFontSizeFn(size){
    var style = document.createElement('style');
    style.innerHTML = `::cue {
        color: white;
        font-family: Arial, Helvetica, sans-serif;
        font-size: ${size}px;
    }`;

    // Append the <style> element to the document head
    document.head.appendChild(style);
}

