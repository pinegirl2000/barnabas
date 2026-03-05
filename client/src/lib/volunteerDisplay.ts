/** 바나바가 구역장(isInternal=false)이면 "구역장(이름)" 형식으로 표시 */
export function volunteerDisplayName(volunteer: any): string {
  if (!volunteer) return '';
  return volunteer.isInternal === false ? `구역장(${volunteer.name})` : volunteer.name;
}

/** 드롭다운 목록용: 구역장은 "구역장"만 표시, 이름 숨김 */
export function volunteerListName(volunteer: any): string {
  if (!volunteer) return '';
  return volunteer.isInternal === false ? '구역장' : volunteer.name;
}
