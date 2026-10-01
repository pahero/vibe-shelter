import { ListLocationsQueryDto } from './list-locations-query.dto';

describe('ListLocationsQueryDto.toQuery', () => {
  it('parses provided filters and pagination', () => {
    expect(new ListLocationsQueryDto().toQuery({ ownerId: 'owner-id', status: 'ACTIVE', skip: '12', limit: '25' })).toEqual({
      ownerId: 'owner-id', status: 'ACTIVE', skip: 12, limit: 25,
    });
  });

  it('applies pagination defaults for omitted and blank values', () => {
    expect(new ListLocationsQueryDto().toQuery({ skip: '', limit: '' })).toEqual({ skip: 0, limit: 50 });
  });

  it('leaves invalid pagination as NaN for the query handler to reject', () => {
    const result = new ListLocationsQueryDto().toQuery({ skip: 'bad' });
    expect(Number.isNaN(result.skip)).toBe(true);
  });
});
