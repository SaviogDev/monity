const RecurrenceRule =
  mongoose.models.RecurrenceRule ||
  mongoose.model('RecurrenceRule', recurrenceRuleSchema);

export default RecurrenceRule;