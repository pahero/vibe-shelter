import { ListCatsQueryDto } from './list-cats-query.dto';

describe('ListCatsQueryDto.toQuery', () => {
  it('normalizes populated filters and pagination values', () => {
    expect(ListCatsQueryDto.toQuery({ locationId: ' location ', search: ' Luna ', tagId: ' tag ', archived: 'true', skip: '4', limit: '20' })).toEqual({
      locationId: 'location', search: 'Luna', tagId: 'tag', archived: true, skip: 4, limit: 20,
    });
  });

  it('uses undefined filters and false archive state when omitted', () => {
    expect(ListCatsQueryDto.toQuery({})).toEqual({ archived: false, locationId: undefined, search: undefined, tagId: undefined, skip: undefined, limit: undefined });
  });

  it('keeps invalid numbers as NaN for the handler to reject', () => {
    const query = ListCatsQueryDto.toQuery({ skip: 'invalid' });
    expect(Number.isNaN(query.skip)).toBe(true);
  });
});
