/** Bottom-left legend: day-graded ramps + discrete statuses. */
import { VF_RAMP, VOA_RAMP, FIXED, UNKNOWN_LIGHT, UNKNOWN_DARK, SELECTED_FILL, isDark } from './colors';

export function renderLegend(el: HTMLElement): void {
  const unk = isDark() ? UNKNOWN_DARK : UNKNOWN_LIGHT;
  const ramp = (colors: string[]) =>
    `<span class="ramp">${colors.map((c) => `<i style="background:${c}"></i>`).join('')}</span>`;
  el.innerHTML = `
  <details class="legend" open>
    <summary>Legend</summary>
    <div class="lg-row">${ramp(VF_RAMP)}<span>Visa-free · darker&nbsp;=&nbsp;longer stay (15d&nbsp;→&nbsp;1y+)</span></div>
    <div class="lg-row">${ramp(VOA_RAMP)}<span>Visa on arrival (/eVisa) · by stay</span></div>
    <div class="lg-row"><i class="sw hatched" style="background:${VF_RAMP[4]}"></i><span>Visa-free (conditional)</span></div>
    <div class="lg-row"><i class="sw" style="background:${FIXED.fom}"></i><span>Freedom of movement</span></div>
    <div class="lg-row"><i class="sw" style="background:${FIXED.eta}"></i><span>Electronic travel authorization</span></div>
    <div class="lg-row"><i class="sw" style="background:${FIXED.ev}"></i><span>eVisa</span></div>
    <div class="lg-row"><i class="sw" style="background:${FIXED.vr}"></i><span>Visa required</span></div>
    <div class="lg-row"><i class="sw" style="background:${FIXED.twv}"></i><span>Transit without visa</span></div>
    <div class="lg-row"><i class="sw" style="background:${FIXED.tvr}"></i><span>Transit visa required</span></div>
    <div class="lg-row"><i class="sw" style="background:${FIXED.susp}"></i><span>Entry temporarily suspended</span></div>
    <div class="lg-row"><i class="sw" style="background:${FIXED.ban}"></i><span>Entry prohibited</span></div>
    <div class="lg-row"><i class="sw" style="background:${FIXED.nr}"></i><span>Not recognized / not accepted</span></div>
    <div class="lg-row"><i class="sw" style="background:${unk}"></i><span>Unknown / no data</span></div>
    <div class="lg-row"><i class="sw sel" style="background:${SELECTED_FILL}"></i><span>Selected country</span></div>
  </details>`;
}
