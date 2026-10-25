// Originally generated from canvas-recorder's canvas-recorder.html.  This is the master copy now.

/** The contents of the player's `<body>`.  {@link canvasRecorder.start} puts this in the page. */
export const playerBodyHtml = `
    <!-- ── Left column ─────────────────────────────────────────────── -->
    <div id="left-col">
      <div id="top-left">
        <div id="zoomControls">
          <label
            >Zoom:
            <select id="zoomSelect">
              <option value="fit" selected>Fit</option>
              <option value="0.25">25%</option>
              <option value="0.50">50%</option>
              <option value="1.00">100%</option>
              <option value="2.00">200%</option>
            </select>
          </label>
          <span
            id="videoSizeControls"
            style="white-space: nowrap"
            title="The size of the video.  Pixels:  the saved file.  Units:  the coordinates everything is drawn in.  Remembered for this video."
            >Size:
            <input type="number" id="videoPixelWidth" min="2" step="2" style="width: 4.5em" />
            ×
            <input type="number" id="videoPixelHeight" min="2" step="2" style="width: 4.5em" />
            px,
            <input type="number" id="videoUnitWidth" min="0" step="any" style="width: 3.5em" />
            ×
            <input type="number" id="videoUnitHeight" min="0" step="any" style="width: 3.5em" />
            units
            <span id="videoSizeWarning" style="color: #a06000"></span>
          </span>
          <button
            type="button"
            id="localFilesBtn"
            hidden
            title="Some of this video's files are on your computer, and the browser needs your OK before it reads them again."
          >
            🔓 Allow local files
          </button>
          <button type="button" id="loadJsonTestBtn">📂 Import</button>
          <!-- Each status is outside its label:  clicking inside a label
               toggles the checkbox, and a status can hold buttons. -->
          <span style="white-space: nowrap">
            <label
              title="Your work is always saved inside the browser (see Load). When this is checked, every one of those saves is also written to a JSON file on disk, for git and your editor. Checking it asks where."
              ><input type="checkbox" id="jsonSyncCheckbox" disabled /> Sync to
              file:</label
            >
            <span id="jsonSyncStatus" style="font-size: 0.85em">…</span>
          </span>
          <button
            type="button"
            id="saveCopyAsJsonBtn"
            title="Write the current state to a file of your choosing, once. Doesn't change which file is synced."
          >
            📋 Save Copy As…
          </button>
          <span style="white-space: nowrap">
            <label
              title="The TypeScript defaults, written to a JSON file whenever they change. Compare with the synced file to see what the Visual Editor changed."
              ><input type="checkbox" id="defaultsSyncCheckbox" disabled /> Sync
              defaults to file:</label
            >
            <span id="defaultsSyncStatus" style="font-size: 0.85em">…</span>
          </span>
          <span style="white-space: nowrap">
            <label
              title="A readable list of every difference from the TypeScript defaults, with code you can paste, rewritten whenever the synced file is."
              ><input type="checkbox" id="diffSyncCheckbox" disabled /> Sync diffs
              to file:</label
            >
            <span id="diffSyncStatus" style="font-size: 0.85em">…</span>
          </span>
          <label hidden
            ><input
              type="radio"
              name="quality"
              id="highQuality"
              value="High Quality"
              checked
            />
            High Quality</label
          >
          <label hidden
            ><input
              type="radio"
              name="quality"
              id="lowPower"
              value="Low Power"
            />
            Low Power</label
          >
        </div>
        <div id="canvasViewport">
          <canvas id="main"></canvas>
          <div id="canvasLoading">Loading…</div>
        </div>
      </div>
      <div class="hresize" id="hresize-left"></div>
      <div id="bottom-left">
        <fieldset id="liveControls">
          <fieldset id="play-controls">
            <div class="range-container">
              <label><input type="checkbox" id="play" />Play</label>
              <button id="back5s" type="button">⏮5s</button>
              <span style="background-color: lightcyan"
                >&nbsp;(At end
                <label
                  ><input
                    type="radio"
                    name="onSectionEnd"
                    value="pause"
                    checked
                  />Pause</label
                >
                <label
                  ><input
                    type="radio"
                    name="onSectionEnd"
                    value="repeat"
                  />Repeat</label
                >)&nbsp;</span
              >
              <input
                type="number"
                id="playPositionSeconds"
                value="0"
                title="The play position, in seconds.  Option-← and Option-→ step one frame."
              />
              <input type="range" id="playPositionRange" value="0" step="any" />
            </div>
          </fieldset>
          <div>
            <label
              title="The component the Visual Editor works on.  Normally the play limits follow it."
              >Edit <select id="chapterSelector"></select
            ></label>
            <label
              title="Picking another component to edit leaves the play limits where they are.  For watching one section over and over while you fix things anywhere."
              ><input type="checkbox" id="keepLimits" />Keep play
              limits</label
            >
          </div>
          <div id="limitsRow">
            <span id="limitsInfo"></span>
            <button type="button" id="playRootBtn">Play this one</button>
          </div>
          <div
            id="autoplayFallbackMsg"
            hidden
            style="
              background: #ffe0b2;
              border: 1px solid #e65100;
              border-radius: 4px;
              padding: 0.4em 0.75em;
              margin-bottom: 0.4em;
            "
          >
            ⚠️ Unexpected problem playing audio. Falling back to silent mode.
          </div>
          <div
            style="
              display: flex;
              align-items: center;
              gap: 0.75em;
              flex-wrap: wrap;
            "
          >
            <label><input type="checkbox" id="muteAudio" /> Mute</label>
            <label
              >Vol
              <input
                type="range"
                id="volumeAudio"
                min="0"
                max="1"
                step="0.05"
                value="1"
                style="width: 5em"
            /></label>
            <label
              >Speed
              <select id="speedAudio">
                <option value="0.5">0.5×</option>
                <option value="0.75">0.75×</option>
                <option value="1" selected>1×</option>
                <option value="1.25">1.25×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2×</option>
              </select>
            </label>
          </div>
        </fieldset>
        <div
          style="
            border: 0.3em inset rgb(178, 178, 178);
            padding: 0.5em;
            margin-top: 0.5em;
          "
        >
          <button id="startRecording">Record and Save Video</button>
          <button id="cancelRecording" disabled>Stop Recording</button>
          <button id="recordJustSound">Record Just Sound</button>
          <div id="info"><i>status goes here</i>...</div>
        </div>
        <div style="margin: 1em 0">
          Hot keys:
          <ul style="margin: 0">
            <li>⌥Space to play or pause.</li>
            <li>⌥B to go back 5 seconds and play.</li>
            <li>⌥0 to jump to the start of the current section.</li>
            <li>⌥← and ⌥→ to step one frame back or forward.</li>
          </ul>
          Alt instead of ⌥ on a PC.
        </div>
        <br />
        <h1>Debug Log</h1>
        <button id="debugLogClearBtn" type="button">Clear</button>
        <pre
          id="debugLog"
          style="
            background: #f5f5f5;
            border: 1px solid #ccc;
            padding: 0.5em;
            overflow: auto;
            max-height: 20em;
            white-space: pre-wrap;
            word-break: break-all;
            font-size: 0.8em;
          "
        ></pre>
        <br />
        <h1>Database Dump</h1>
        <button id="dumpDbBtn" type="button">🗄 Dump All DB State</button>
        <pre
          id="dbDump"
          style="
            background: #f5f5f5;
            border: 1px solid #ccc;
            padding: 1em;
            overflow: auto;
            max-height: 40em;
            white-space: pre-wrap;
            word-break: break-all;
            font-size: 0.85em;
          "
        ></pre>
      </div>
    </div>

    <!-- ── Vertical resize handle ───────────────────────────────────── -->
    <div id="vresize"></div>

    <!-- ── Right column ────────────────────────────────────────────── -->
    <div id="right-col">
      <div id="top-right">
        <div id="tr-header">
          <button id="reloadBtn" type="button">↺ Reload</button>
          <span id="scheduleHistoryControls" hidden>
            <button
              id="openHistoryDialogBtn"
              type="button"
              title="Load / Browse History"
            >
              📂 Load
            </button>
          </span>
          <label
            title="Show what's said in each sound clip, word by word, on the timeline.  Each sound file is transcribed once, on this computer, in the background.  The first time downloads about 170 MB of speech models."
          >
            <input type="checkbox" id="transcriptsCheckbox" />
            🗣 Transcripts
          </label>
          <span id="transcriptsStatus" style="font-size: 0.85em; color: #555"></span>
          <label
            title="Show the sound clips' transcripts as text you can read, search and copy, in place of the timeline.  Click a word to jump to it.  Select words to cut them out."
          >
            <input type="checkbox" id="transcriptViewCheckbox" />
            📖 Text
          </label>
        </div>
        <canvas
          id="timelineCanvas"
          title="Click to seek · Shift-drag to scrub · Drag to pan · Scroll to zoom · Click block to select · Click a word to play from just before it · Dragged sound clip edges snap to the quiet moments between words (hold Alt to drag freely)"
        ></canvas>
        <fieldset id="componentsEditor" hidden>
          <!-- dynamically populated by canvas-recorder.ts -->
        </fieldset>
      </div>
      <div class="hresize" id="hresize-right"></div>
      <div id="bottom-right">
        <fieldset id="scheduleEditor">
          <p>Coming soon! Edit fields here. TODO.</p>
        </fieldset>
      </div>
    </div>

    <dialog id="historyDialog" style="min-width: 30em; padding: 1em">
      <h3 style="margin: 0 0 0.6em 0">Load</h3>
      <div
        id="historyDialogHint"
        style="
          margin-bottom: 0.5em;
          font-size: 0.85em;
          color: #555;
          font-style: italic;
          min-height: 1.2em;
        "
      ></div>
      <ul
        id="historyList"
        style="
          list-style: none;
          padding: 0;
          margin: 0 0 1em 0;
          max-height: 22em;
          overflow-y: auto;
          border: 1px solid #ccc;
          border-radius: 4px;
          min-height: 2em;
        "
      ></ul>
      <div style="display: flex; gap: 0.5em; align-items: center">
        <button
          id="historyDeleteBtn"
          type="button"
          disabled
          title="Remove this entry from the database"
        >
          🗑 Delete
        </button>
        <div style="flex: 1"></div>
        <button id="historyAbandonBtn" type="button" hidden>
          Switch &amp; Abandon
        </button>
        <button id="historySaveBtn" type="button" hidden>
          Switch &amp; Save
        </button>
        <button id="historyOkBtn" type="button">Keep</button>
        <button id="historyCancelBtn" type="button">Revert</button>
      </div>
    </dialog>

    <dialog id="saveDialog" style="min-width: 28em">
      <h2 style="margin-top: 0">Save Video</h2>
      <div style="margin-bottom: 0.6em">
        <label
          >Chapter:
          <select id="saveChapterSelect" style="max-width: 28em"></select>
        </label>
        &nbsp;
        <button type="button" id="saveCopyChapterBtn">Copy from viewer</button>
        &nbsp;
        <button type="button" id="saveAllBtn">Save All</button>
      </div>
      <div style="margin-bottom: 0.6em; display: flex; gap: 1.5em">
        <label
          >Start (s):
          <input
            type="number"
            id="saveStartSeconds"
            step="0.001"
            min="0"
            style="width: 8em"
          />
        </label>
        <label
          >End (s):
          <input
            type="number"
            id="saveEndSeconds"
            step="0.001"
            min="0"
            style="width: 8em"
          />
        </label>
      </div>
      <div style="margin-bottom: 0.6em">
        <label
          >Size:
          <input
            type="number"
            id="saveWidth"
            min="2"
            step="2"
            style="width: 6em"
          />
        </label>
        ×
        <label
          ><input
            type="number"
            id="saveHeight"
            min="2"
            step="2"
            style="width: 6em"
          />
          px</label
        >
        &nbsp;
        <label
          title="Change the other number to match, keeping the video's shape.  Uncheck to stretch or squish the picture."
          ><input type="checkbox" id="saveKeepAspect" checked /> Keep aspect
          ratio</label
        >
        &nbsp;
        <button
          type="button"
          id="saveVideoSizeBtn"
          title="Use the video's own size."
        >
          Video size
        </button>
        <div id="saveSizeNote" style="font-size: 0.85em; min-height: 1.2em"></div>
      </div>
      <table style="margin-bottom: 0.75em; border-collapse: collapse">
        <tr>
          <td>Start:</td>
          <td
            id="saveInfoStart"
            style="padding-left: 1em; font-family: monospace"
          ></td>
        </tr>
        <tr>
          <td>End:</td>
          <td
            id="saveInfoEnd"
            style="padding-left: 1em; font-family: monospace"
          ></td>
        </tr>
        <tr>
          <td>Duration:</td>
          <td
            id="saveInfoDuration"
            style="padding-left: 1em; font-family: monospace"
          ></td>
        </tr>
        <tr>
          <td>Frames:</td>
          <td
            id="saveInfoFrames"
            style="padding-left: 1em; font-family: monospace"
          ></td>
        </tr>
      </table>
      <div
        id="saveLocalFilesRow"
        hidden
        style="margin-bottom: 0.6em; color: #a06000"
      >
        <span id="saveLocalFilesNote"></span>
        <button type="button" id="saveLocalFilesBtn">🔓 Allow</button>
      </div>
      <div>
        <button type="button" id="saveOkBtn">OK — Choose File</button>
        &nbsp;
        <button type="button" id="saveDialogCancelBtn">Cancel</button>
      </div>
    </dialog>
  `;
