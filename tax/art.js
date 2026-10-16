export function art(name) {
  return `<img class="art-img art-${name}" src="tax/art/${name}.png?v=4" alt="">`;
}

export const JOB_ART = {
  文職: "job-office",
  IT: "job-it",
  零售: "job-retail",
  飲食: "job-food",
  教育: "job-teach",
  銷售: "job-sales",
  醫療: "job-medical",
  建造: "job-build",
  Freelance: "job-freelance",
  其他: "job-other",
};
