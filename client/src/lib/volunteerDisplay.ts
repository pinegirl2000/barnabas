/** 바나바가 구역장(isInternal=false)이면 "구역장"만 표시 */
export function volunteerDisplayName(volunteer: any): string {
  if (!volunteer) return '';
  return volunteer.isInternal === false ? '구역장' : volunteer.name;
}
