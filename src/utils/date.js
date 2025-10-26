export function lastDayPrevMonthISO(){
  const now=new Date(); const d=new Date(now.getFullYear(), now.getMonth(), 0);
  return d.toISOString().slice(0,10);
}
